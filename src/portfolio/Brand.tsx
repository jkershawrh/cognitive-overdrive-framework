import type { CSSProperties } from 'react'

/** Exact source geometry from the original Cognitive Overdrive film. */
const reference = {
  src: '/brand/approved-main-reference.png',
  width: 1536,
  height: 1024,
} as const

const crops = {
  mark: { x: 53, y: 17, width: 65, height: 38 },
  wordmark: { x: 47, y: 126, width: 638, height: 209 },
} as const

type BrandProps = {
  /** Display width in pixels. The crop scales proportionally when space is smaller. */
  width?: number
  className?: string
  /** Use an empty label when adjacent text already names the brand. */
  label?: string
}

function OriginalBrandCrop({
  crop,
  width,
  className,
  label,
}: Required<Pick<BrandProps, 'width' | 'label'>> & Pick<BrandProps, 'className'> & {
  crop: typeof crops.mark | typeof crops.wordmark
}) {
  const container: CSSProperties = {
    display: 'inline-block',
    position: 'relative',
    width,
    maxWidth: '100%',
    aspectRatio: `${crop.width} / ${crop.height}`,
    overflow: 'hidden',
    verticalAlign: 'middle',
    flexShrink: 0,
    mixBlendMode: 'screen',
  }

  return (
    <span
      className={className}
      style={container}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <img
        src={reference.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        decoding="sync"
        style={{
          position: 'absolute',
          display: 'block',
          width: `${(reference.width / crop.width) * 100}%`,
          height: `${(reference.height / crop.height) * 100}%`,
          maxWidth: 'none',
          left: `${(-crop.x / crop.width) * 100}%`,
          top: `${(-crop.y / crop.height) * 100}%`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </span>
  )
}

export function BrandMark({ width = 52, className, label = 'Cognitive Overdrive' }: BrandProps) {
  return <OriginalBrandCrop crop={crops.mark} width={width} className={['co-brand-mark',className].filter(Boolean).join(' ')} label={label} />
}

export function BrandWordmark({ width = 638, className, label = 'Cognitive Overdrive' }: BrandProps) {
  return <OriginalBrandCrop crop={crops.wordmark} width={width} className={['co-brand-wordmark',className].filter(Boolean).join(' ')} label={label} />
}
