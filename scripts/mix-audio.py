#!/usr/bin/env python3
"""Mix existing portfolio narration and original brand music without retiming speech.

Requires numpy, scipy, ffmpeg and ffprobe. No credential or network access.
Timeline start times already include the visual intro unless --voice-offset is used.
The outro occupies the timeline's existing closing hold; it does not extend it.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, lfilter, stft


ROOT = Path(__file__).resolve().parents[1]
SR = 48000
HOP = 480


def db(value):
    return 20 * np.log10(np.maximum(value, 1e-12))


def gain(value):
    return 10 ** (value / 20)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def save_audio(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(path, SR, value.astype(np.float32))


def load_audio(path):
    rate, audio = wavfile.read(path)
    if rate != SR:
        raise ValueError(f"Expected {SR} Hz audio: {path.name}")
    if audio.dtype.kind in "iu":
        audio = audio.astype(np.float32) / (2 ** (audio.dtype.itemsize * 8 - 1))
    else:
        audio = audio.astype(np.float32)
    if audio.ndim == 1:
        audio = np.column_stack([audio, audio])
    return audio


def rms_frames(audio):
    if audio.ndim == 2:
        power = np.mean(audio * audio, axis=1)
    else:
        power = audio * audio
    count = math.ceil(len(power) / HOP)
    padded = np.pad(power, (0, count * HOP - len(power)))
    return np.sqrt(padded.reshape(count, HOP).mean(axis=1) + 1e-20)


def envelope(values, attack_ms, release_ms):
    attack = math.exp(-10 / attack_ms)
    release = math.exp(-10 / release_ms)
    result = np.empty_like(values)
    previous = 0.0
    for i, target in enumerate(values):
        coefficient = attack if target > previous else release
        previous = coefficient * previous + (1 - coefficient) * target
        result[i] = previous
    return result


def expand(values, length):
    return np.interp(np.arange(length), np.arange(len(values)) * HOP + HOP / 2, values).astype(np.float32)


def measurements(audio):
    levels = db(rms_frames(audio))
    active = levels > max(-45, float(levels.max()) - 28)
    active_levels = levels[active]
    peak = float(db(np.abs(audio).max()))
    voiced_rms = float(10 * np.log10(np.mean(10 ** (active_levels / 10))))
    return {
        "sample_peak_dbfs": peak,
        "voiced_rms_dbfs": voiced_rms,
        "voiced_rms_p20_dbfs": float(np.percentile(active_levels, 20)),
        "voiced_rms_p90_dbfs": float(np.percentile(active_levels, 90)),
        "voiced_range_p90_minus_p20_db": float(np.percentile(active_levels, 90) - np.percentile(active_levels, 20)),
        "voiced_crest_db": peak - voiced_rms,
        "active_fraction": float(active.mean()),
    }


def biquad(audio, frequency, amount_db, kind, q=0.707):
    a = 10 ** (amount_db / 40)
    w = 2 * np.pi * frequency / SR
    c, s = np.cos(w), np.sin(w)
    alpha = s / (2 * q)
    if kind == "bell":
        b = [1 + alpha * a, -2 * c, 1 - alpha * a]
        denominator = [1 + alpha / a, -2 * c, 1 - alpha / a]
    elif kind == "low":
        beta = 2 * np.sqrt(a) * alpha
        b = [a * ((a + 1) - (a - 1) * c + beta), 2 * a * ((a - 1) - (a + 1) * c), a * ((a + 1) - (a - 1) * c - beta)]
        denominator = [(a + 1) + (a - 1) * c + beta, -2 * ((a - 1) + (a + 1) * c), (a + 1) + (a - 1) * c - beta]
    else:
        beta = 2 * np.sqrt(a) * alpha
        b = [a * ((a + 1) + (a - 1) * c + beta), -2 * a * ((a - 1) + (a + 1) * c), a * ((a + 1) + (a - 1) * c - beta)]
        denominator = [(a + 1) - (a - 1) * c + beta, 2 * ((a - 1) - (a + 1) * c), (a + 1) - (a - 1) * c - beta]
    return lfilter(np.array(b) / denominator[0], np.array(denominator) / denominator[0], audio).astype(np.float32)


def process_voice(stereo, profile):
    raw = stereo.mean(axis=1)
    before = measurements(raw)
    voice = sosfilt(butter(2, profile["highpass_hz"], btype="highpass", fs=SR, output="sos"), raw).astype(np.float32)
    for key, kind in [("body_shelf", "low"), ("lowmid_bell", "bell"), ("presence_bell", "bell"), ("air_shelf", "high")]:
        settings = profile[key]
        voice = biquad(voice, settings["frequency_hz"], settings["gain_db"], kind, settings.get("q", 0.707))
    detector = profile["deessing"]
    frequencies, times, spectrum = stft(voice, fs=SR, nperseg=1024, noverlap=512, boundary=None)
    power = np.abs(spectrum) ** 2
    broadband = power[(frequencies >= 1000) & (frequencies <= 11000)].sum(axis=0)
    highband = power[(frequencies >= detector["band_hz"][0]) & (frequencies <= detector["band_hz"][1])].sum(axis=0)
    ratios = highband / np.maximum(broadband, 1e-20)
    spectral_active = broadband > max(float(broadband.max()) * 1e-4, 1e-10)
    hot_fraction = float(np.mean(ratios[spectral_active] > detector["ratio_trigger"]))
    deess_enabled = hot_fraction > detector["fraction_trigger"]
    reduction = np.zeros(math.ceil(len(voice) / HOP), dtype=np.float32)
    if deess_enabled:
        targets = np.clip((ratios - detector["ratio_trigger"]) * 8, 0, detector["max_reduction_db"]) * spectral_active
        frames = np.interp(np.arange(len(reduction)) * HOP / SR, times, targets)
        reduction = envelope(frames, detector["attack_ms"], detector["release_ms"])
        band = sosfilt(butter(2, detector["band_hz"], btype="bandpass", fs=SR, output="sos"), voice)
        voice = (voice - band * (1 - gain(-expand(reduction, len(voice))))).astype(np.float32)
    deess_metrics = {"applied": deess_enabled, "measured_highband_fraction_above_ratio_trigger": hot_fraction, "ratio_trigger": detector["ratio_trigger"], "fraction_trigger": detector["fraction_trigger"], "maximum_band_reduction_db": float(reduction.max())}
    comp = profile["compression"]
    measured = measurements(voice)
    enabled = measured["voiced_range_p90_minus_p20_db"] > comp["range_trigger_db"] or measured["voiced_crest_db"] > comp["crest_trigger_db"]
    rms = rms_frames(voice)
    levels = db(rms)
    active = levels > max(-45, float(levels.max()) - 28)
    threshold = float(np.percentile(levels[active], 75) - 3)
    compressed = np.zeros_like(levels)
    if enabled:
        over = levels - threshold
        knee = comp["knee_db"]
        soft = np.where(over < -knee / 2, 0, np.where(over > knee / 2, over, (over + knee / 2) ** 2 / (2 * knee)))
        targets = np.clip((1 - 1 / comp["ratio"]) * soft, 0, comp["max_reduction_db"])
        compressed = envelope(targets, comp["attack_ms"], comp["release_ms"])
        voice *= gain(-expand(compressed, len(voice)))
    compression_metrics = {"applied": enabled, "measured_range_db": measured["voiced_range_p90_minus_p20_db"], "measured_crest_db": measured["voiced_crest_db"], "threshold_dbfs": threshold, "ratio": comp["ratio"], "maximum_reduction_db": float(compressed.max()), "mean_voiced_reduction_db": float(compressed[active].mean())}
    return np.column_stack([voice, voice]), {"raw": before, "equalization": {k: v for k, v in profile.items() if k in ["highpass_hz", "body_shelf", "lowmid_bell", "presence_bell", "air_shelf"]}, "compression": compression_metrics, "deessing": deess_metrics}


def loop_bed(source, count, crossfade):
    result = np.zeros((count, 2), dtype=np.float32)
    fade = min(round(crossfade * SR), len(source) // 3)
    loop = source.copy()
    loop[:fade] *= np.linspace(0, 1, fade)[:, None]
    loop[-fade:] *= np.linspace(1, 0, fade)[:, None]
    for start in range(0, count, len(loop) - fade):
        length = min(len(loop), count - start)
        result[start:start + length] += loop[:length]
    return result


def duck_music(voice, bed, profile):
    voice_levels = db(rms_frames(voice))
    music_levels = db(rms_frames(bed))
    voiced = voice_levels > -38
    requested = np.clip(music_levels - voice_levels + profile["voice_differential_target_db"], profile["voice_duck_min_db"], profile["voice_duck_max_db"])
    # Forty milliseconds of lookahead begins ducking before a spoken onset.
    requested = np.where(voiced, requested, 0)
    requested = np.pad(requested[4:], (0, 4))[:len(requested)]
    attenuation = envelope(requested, profile["duck_attack_ms"], profile["duck_release_ms"])
    mixed = bed * gain(-expand(attenuation, len(bed)))[:, None]
    actual_music = db(rms_frames(mixed))
    eligible = voiced & (actual_music > -70)
    difference = voice_levels[eligible] - actual_music[eligible]
    metrics = {"voiced_detector_threshold_dbfs": -38, "maximum_music_attenuation_db": float(attenuation.max()), "mean_attenuation_during_voice_db": float(attenuation[voiced].mean()), "music_under_voice_rms_difference_db": {"p10": float(np.percentile(difference, 10)), "median": float(np.median(difference)), "p90": float(np.percentile(difference, 90))}, "measurement_window_ms": 10, "note": "RMS differences describe voiced windows, not a listening verdict or LUFS subtraction."}
    return mixed.astype(np.float32), metrics


def add(target, source, start):
    start = round(start * SR)
    if start < 0:
        source = source[-start:]
        start = 0
    count = min(len(source), len(target) - start)
    if count > 0:
        target[start:start + count] += source[:count]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeline", default="narration/cinematic-timeline.json")
    parser.add_argument("--profile", default="narration/mix-profile.json")
    parser.add_argument("--output", default="output/v2/portfolio-master.wav")
    parser.add_argument("--voice-offset", type=float, default=0)
    parser.add_argument("--intro-seconds", type=float, default=10)
    parser.add_argument("--outro-seconds", type=float, default=4)
    parser.add_argument("--ffmpeg", default=os.environ.get("FFMPEG_BIN", "ffmpeg"))
    parser.add_argument("--ffprobe", default=os.environ.get("FFPROBE_BIN", "ffprobe"))
    parser.add_argument("--skip-chapters", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    os.chdir(ROOT)
    profile = json.loads(Path(args.profile).read_text())
    timeline = json.loads(Path(args.timeline).read_text())
    output = Path(args.output)
    work = output.parent / "audio-work"
    preview = ROOT / "public/narration/mixed"
    music_config = profile["music"]
    if profile["sample_rate"] != SR:
        raise ValueError("Mix profile sample rate must be 48000 Hz.")
    for track in timeline["schedule"]:
        file = ROOT / "public" / track["src"].lstrip("/")
        if not file.is_file():
            raise ValueError("Missing narration: " + track["id"])
    for key in ["theme", "underscore", "sting"]:
        if not Path(music_config[key]).is_file():
            raise ValueError("Missing original music asset: " + key)
    first_voice = min(t["start"] for t in timeline["schedule"]) + args.voice_offset
    if first_voice < args.intro_seconds:
        raise ValueError("First narration overlaps the requested full intro. Supply the cinematic timeline or an explicit --voice-offset.")
    if args.dry_run:
        print(json.dumps({"ready": True, "chapters": len(timeline["schedule"]), "first_voice_seconds": first_voice, "duration_seconds": timeline["total"] + args.voice_offset, "new_voice_requests": 0}, indent=2))
        return
    output.parent.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)
    preview.mkdir(parents=True, exist_ok=True)

    def ff(*parameters):
        environment = os.environ.copy()
        if "/" in args.ffmpeg:
            environment["DYLD_LIBRARY_PATH"] = str(Path(args.ffmpeg).resolve().parent) + (":" + environment["DYLD_LIBRARY_PATH"] if environment.get("DYLD_LIBRARY_PATH") else "")
        result = subprocess.run([args.ffmpeg, "-hide_banner", "-nostdin", "-y", *map(str, parameters)], capture_output=True, text=True, env=environment)
        if result.returncode:
            raise RuntimeError(result.stderr[-3000:])
        return result.stderr

    def measure(path):
        stderr = ff("-i", path, "-af", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-")
        report = json.JSONDecoder().raw_decode(stderr[stderr.rfind("{"):])[0]
        return {"integrated_lufs": float(report["input_i"]), "true_peak_dbtp": float(report["input_tp"]), "loudness_range_lu": float(report["input_lra"]), "threshold_lufs": float(report["input_thresh"])}

    def media(path):
        environment = os.environ.copy()
        if "/" in args.ffprobe:
            environment["DYLD_LIBRARY_PATH"] = str(Path(args.ffprobe).resolve().parent) + (":" + environment["DYLD_LIBRARY_PATH"] if environment.get("DYLD_LIBRARY_PATH") else "")
        result = subprocess.run([args.ffprobe, "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,sample_rate,channels,channel_layout,duration", "-of", "json", str(path)], capture_output=True, text=True, env=environment)
        if result.returncode:
            raise RuntimeError(result.stderr[-1500:])
        return json.loads(result.stdout)

    def master(source, destination):
        settings = profile["master"]
        first = ff("-i", source, "-af", f'loudnorm=I={settings["integrated_target_lufs"]}:TP={settings["true_peak_target_dbtp"]}:LRA={settings["loudness_range_target_lu"]}:print_format=json', "-f", "null", "-")
        measured = json.JSONDecoder().raw_decode(first[first.rfind("{"):])[0]
        filt = f'loudnorm=I={settings["integrated_target_lufs"]}:TP={settings["true_peak_target_dbtp"]}:LRA={settings["loudness_range_target_lu"]}:measured_I={measured["input_i"]}:measured_TP={measured["input_tp"]}:measured_LRA={measured["input_lra"]}:measured_thresh={measured["input_thresh"]}:offset={measured["target_offset"]}:linear=true:print_format=json'
        stderr = ff("-i", source, "-af", filt, "-ar", SR, "-ac", 2, "-c:a", "pcm_s24le", destination)
        normalization = json.JSONDecoder().raw_decode(stderr[stderr.rfind("{"):])[0]
        return {"premaster": {"integrated_lufs": float(measured["input_i"]), "true_peak_dbtp": float(measured["input_tp"]), "loudness_range_lu": float(measured["input_lra"])}, "normalization_type": normalization.get("normalization_type"), "measured": measure(destination)}

    metrics = {"version": 1, "profile_sha256": digest(args.profile), "timeline_sha256": digest(args.timeline), "new_voice_requests": 0, "time_stretching": False, "pitch_shift": False, "voice_reverb": False, "sample_rate": SR, "channels": 2, "tracks": [], "music": {}, "subjective_listening_review": "pending"}
    voices = {}
    for track in timeline["schedule"]:
        print("Processing existing voice: " + track["id"], flush=True)
        original = ROOT / "public" / track["src"].lstrip("/")
        decoded = work / (track["id"] + "-raw.wav")
        ff("-i", original, "-ar", SR, "-ac", 2, "-c:a", "pcm_s24le", decoded)
        raw = load_audio(decoded)
        processed, report = process_voice(raw, profile["voice"])
        report.update({"id": track["id"], "source_sha256": digest(original), "raw_loudness": measure(decoded)})
        processed_path = work / (track["id"] + "-processed.wav")
        save_audio(processed_path, processed)
        loudness = measure(processed_path)
        static_gain = min(profile["voice"]["integrated_target_lufs"] - loudness["integrated_lufs"], profile["voice"]["static_peak_ceiling_dbtp"] - loudness["true_peak_dbtp"])
        processed *= gain(static_gain)
        save_audio(processed_path, processed)
        report.update({"static_level_gain_db": static_gain, "processed": measurements(processed), "processed_loudness": measure(processed_path)})
        voices[track["id"]] = processed
        metrics["tracks"].append(report)
    normalized_music = {}
    for key, target in [("theme", music_config["intro_target_lufs"]), ("underscore", music_config["bed_base_lufs"]), ("sting", music_config["outro_sting_target_lufs"])]:
        source = Path(music_config[key])
        measured = measure(source)
        adjustment = target - measured["integrated_lufs"]
        normalized_music[key] = load_audio(source) * gain(adjustment)
        metrics["music"][key] = {"source_sha256": digest(source), "raw_loudness": measured, "static_gain_db": adjustment}
    length = round((timeline["total"] + args.voice_offset) * SR)
    voice = np.zeros((length, 2), dtype=np.float32)
    for track in timeline["schedule"]:
        add(voice, voices[track["id"]], track["start"] + args.voice_offset)
    music = np.zeros_like(voice)
    bed_start = max(0, args.intro_seconds - 1)
    start_sample = round(bed_start * SR)
    music[start_sample:] = loop_bed(normalized_music["underscore"], length - start_sample, music_config["loop_crossfade_seconds"])
    music, metrics["music_ducking"] = duck_music(voice, music, music_config)
    theme = normalized_music["theme"][:round(args.intro_seconds * SR)].copy()
    if len(theme) > 0:
        fade = min(round(.5 * SR), len(theme))
        theme[-fade:] *= np.linspace(1, 0, fade)[:, None]
        add(music, theme, 0)
    tail = min(round(args.outro_seconds * SR), length)
    sting = normalized_music["sting"]
    if tail > len(sting):
        add(music, sting, (length - len(sting)) / SR)
    fade = min(round(.7 * SR), length)
    music[-fade:] *= np.linspace(1, 0, fade)[:, None]
    premaster = work / "portfolio-premaster.wav"
    save_audio(work / "voice-stem.wav", voice)
    save_audio(work / "music-stem.wav", music)
    save_audio(premaster, voice + music)
    print("Mastering film mix and measuring loudness…", flush=True)
    metrics["master"] = master(premaster, output)
    metrics["voice_stem_loudness"] = measure(work / "voice-stem.wav")
    metrics["music_stem_loudness"] = measure(work / "music-stem.wav")
    soundtrack = preview / "portfolio-master.mp3"
    ff("-i", output, "-c:a", "libmp3lame", "-b:a", "192k", "-ar", SR, soundtrack)
    metrics["web_master"] = {"src": "/narration/mixed/portfolio-master.mp3", "sha256": digest(soundtrack), "measured": measure(soundtrack)}
    metrics["master_media"] = media(output)
    metrics["web_master"]["media"] = media(soundtrack)
    metrics["duration_seconds"] = length / SR
    metrics["output_sha256"] = digest(output)
    metrics["voice_offset_seconds"] = args.voice_offset
    metrics["first_voice_seconds"] = first_voice
    previews = []
    if not args.skip_chapters:
        for track in timeline["schedule"]:
            print("Preparing mixed chapter: " + track["id"], flush=True)
            chapter_voice = voices[track["id"]]
            chapter_bed = loop_bed(normalized_music["underscore"], len(chapter_voice), music_config["loop_crossfade_seconds"])
            chapter_bed, duck = duck_music(chapter_voice, chapter_bed, music_config)
            fade = min(round(.65 * SR), len(chapter_bed))
            chapter_bed[-fade:] *= np.linspace(1, 0, fade)[:, None]
            pre = work / (track["id"] + "-mixed-premaster.wav")
            mastered = work / (track["id"] + "-mixed-master.wav")
            save_audio(pre, chapter_voice + chapter_bed)
            report = master(pre, mastered)
            destination = preview / (track["id"] + ".mp3")
            ff("-i", mastered, "-c:a", "libmp3lame", "-b:a", "192k", "-ar", SR, destination)
            report["encoded_mp3"] = measure(destination)
            report["music_ducking"] = duck
            report["sha256"] = digest(destination)
            previews.append({"id": track["id"], "text": track["text"], "src": "/narration/mixed/" + track["id"] + ".mp3", "originalSrc": track["src"], "duration": len(chapter_voice) / SR, "metrics": report})
        save_json(preview / "manifest.json", {"voice": "Kersh", "mix": "Original Cognitive Overdrive theme and underscore; measured voice processing", "tracks": [{k: v for k, v in t.items() if k != "metrics"} for t in previews]})
    metrics["chapter_previews"] = previews
    save_json(output.with_suffix(".metrics.json"), metrics)
    print(json.dumps({"output": str(output), "web_master": metrics["web_master"]["src"], "duration_seconds": metrics["duration_seconds"], "measured_wav": metrics["master"]["measured"], "measured_mp3": metrics["web_master"]["measured"], "voiced_music_difference": metrics["music_ducking"]["music_under_voice_rms_difference_db"], "subjective_listening_review": "pending"}, indent=2), flush=True)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError, KeyError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
