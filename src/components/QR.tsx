import { QRCodeSVG } from 'qrcode.react'

interface Props {
  value: string
  size?: number
}

/** Client-side QR (no external service). Deep teal on cream, high error correction. */
export default function QR({ value, size = 340 }: Props) {
  return (
    <div
      style={{
        background: '#ffffff',
        padding: 16,
        borderRadius: 'var(--radius-surface)',
        border: '1px solid var(--outline)',
        display: 'inline-block',
        lineHeight: 0,
      }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        bgColor="#ffffff"
        fgColor="#0b2e38"
        marginSize={0}
      />
    </div>
  )
}
