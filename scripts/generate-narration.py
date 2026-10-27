#!/usr/bin/env python3
"""Generate owner-authorized narration with an existing ElevenLabs voice.

Secrets stay in process memory. There are no automatic retries after a provider
request. Existing completed takes are reused only when their input hash matches.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def write_json(path: Path, value: object) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    temporary.replace(path)


def credential(service: str, account: str) -> str:
    key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
    if key:
        return key.strip()
    result = subprocess.run(
        ["security", "find-generic-password", "-s", service, "-a", account, "-w"],
        capture_output=True, text=True, check=False,
    )
    if result.returncode or not result.stdout.strip():
        raise RuntimeError("Saved ElevenLabs credential is unavailable; no provider request was submitted.")
    return result.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--track", action="append", default=[])
    parser.add_argument("--keychain-service", default="arf-model-gateways")
    parser.add_argument("--keychain-account", default="elevenlabs")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    profile = json.loads((root / "narration/voice-profile.json").read_text())
    tracks = json.loads((root / "narration/tracks.json").read_text())
    output = root / "public/narration"
    receipts = root / "narration/production"
    output.mkdir(parents=True, exist_ok=True)
    receipts.mkdir(parents=True, exist_ok=True)
    pending = []
    for track in tracks:
        if args.track and track["id"] not in args.track:
            continue
        payload = {
            "text": f'[{track["direction"]}] {track["text"]}',
            "model_id": profile["model_id"],
            "voice_settings": profile["voice_settings"],
        }
        input_hash = digest({"payload": payload, "voice_id": profile["voice_id"]})
        target = output / f'{track["id"]}.mp3'
        receipt_path = receipts / f'{track["id"]}.json'
        if target.exists():
            receipt = json.loads(receipt_path.read_text()) if receipt_path.exists() else {}
            if receipt.get("input_sha256") != input_hash:
                raise RuntimeError(f'{track["id"]}: existing take differs; archive it deliberately before generating another.')
            print(f'{track["id"]}: existing matched take reused', flush=True)
        else:
            pending.append((track, payload, input_hash, target, receipt_path))
    print(f'{len(pending)} tracks ready; {sum(len(p[1]["text"]) for p in pending)} submitted characters.', flush=True)
    if args.dry_run:
        print("Dry run complete; no credential read and no provider request submitted.", flush=True)
        return 0
    key = credential(args.keychain_service, args.keychain_account) if pending else None
    for track, payload, input_hash, target, receipt_path in pending:
        request = urllib.request.Request(
            "https://api.elevenlabs.io/v1/text-to-speech/" + profile["voice_id"] +
            "/with-timestamps?output_format=" + profile["output_format"],
            headers={"xi-api-key": key, "Content-Type": "application/json"},
            data=json.dumps(payload).encode(), method="POST",
        )
        print(f'{track["id"]}: generating one take', flush=True)
        try:
            with urllib.request.urlopen(request, timeout=240) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f'{track["id"]}: ElevenLabs HTTP {error.code}; no automatic retry submitted.') from None
        except (urllib.error.URLError, TimeoutError) as error:
            raise RuntimeError(f'{track["id"]}: provider connection did not complete ({type(error).__name__}); request outcome may be uncertain, no automatic retry submitted.') from None
        audio = base64.b64decode(result["audio_base64"], validate=True)
        if len(audio) < 1024:
            raise RuntimeError(f'{track["id"]}: returned audio is unexpectedly short.')
        temporary = target.with_suffix(".mp3.tmp")
        temporary.write_bytes(audio)
        temporary.replace(target)
        alignment = result.get("alignment") or result.get("normalized_alignment")
        duration = alignment["character_end_times_seconds"][-1] if alignment else None
        receipt = {
            "id": track["id"], "input_sha256": input_hash,
            "audio_sha256": hashlib.sha256(audio).hexdigest(),
            "model_id": profile["model_id"], "voice_name": profile["voice_name"],
            "settings_submitted": profile["voice_settings"],
            "direction": track["direction"], "generation_requests": 1,
            "alignment_duration_seconds": duration, "bytes": len(audio),
            "post_generation_time_stretching": False,
            "subjective_listening_review": "pending",
        }
        write_json(receipt_path, receipt)
        if alignment:
            write_json(receipts / f'{track["id"]}-alignment.json', alignment)
        print(f'{track["id"]}: saved ({duration or "unknown"} seconds)', flush=True)
    manifest_tracks = []
    for track in tracks:
        item = {"id": track["id"], "text": track["text"], "src": f'/narration/{track["id"]}.mp3'}
        receipt_path = receipts / f'{track["id"]}.json'
        if receipt_path.exists():
            receipt = json.loads(receipt_path.read_text())
            if receipt.get("alignment_duration_seconds"):
                item["duration"] = receipt["alignment_duration_seconds"]
        manifest_tracks.append(item)
    write_json(output / "manifest.json", {"voice": "Kersh", "tracks": manifest_tracks})
    print("Narration manifest written. Human review of likeness and inflection remains pending.", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError, KeyError, OSError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
