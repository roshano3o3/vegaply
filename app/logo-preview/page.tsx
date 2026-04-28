// TODO: Remove before production launch
'use client'
import { LogoVegaStar } from '@/components/logo/LogoVegaStar'

const SIZES = [16, 32, 64, 128] as const

function Wordmark({ size }: { size: number }) {
  const gap = Math.round(size * 0.3)
  const fontSize = Math.round(size * 0.56)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <LogoVegaStar size={size} />
      {size >= 32 && (
        <span style={{ fontSize, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, fontFamily: 'var(--font-sora, sans-serif)' }}>
          <span style={{ color: '#fff' }}>Vega</span>
          <span style={{ color: '#FBBF24' }}>ply</span>
        </span>
      )}
    </div>
  )
}

function SizeRow({ bg }: { bg: string }) {
  return (
    <div className="rounded-xl p-6 flex flex-col gap-6" style={{ background: bg }}>
      <div className="flex items-end gap-8 flex-wrap">
        {SIZES.map((s) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <LogoVegaStar size={s} />
            <span className="text-xs font-mono opacity-40">{s}px</span>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-10 flex-wrap">
        {([32, 64] as const).map((s) => (
          <div key={s} className="flex flex-col gap-2">
            <Wordmark size={s} />
            <span className="text-xs font-mono opacity-40">mark + wordmark @ {s}px</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <LogoVegaStar size={16} />
        <LogoVegaStar size={16} />
        <LogoVegaStar size={16} />
        <span className="text-xs font-mono opacity-40 ml-2">favicon strip (16px)</span>
      </div>
    </div>
  )
}

export default function LogoPreviewPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Vegaply — Vega Star (selected)</h1>
          <p className="text-sm text-neutral-400">Option 2 is live across the site. Remove this page before launch.</p>
        </header>

        <div>
          <p className="text-xs text-neutral-500 mb-2 font-mono">dark bg (#0a0a0a)</p>
          <SizeRow bg="#0a0a0a" />
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-2 font-mono">card bg (#1a1a1a)</p>
          <SizeRow bg="#1a1a1a" />
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-2 font-mono">white bg — versatility check</p>
          <SizeRow bg="#ffffff" />
        </div>

        <footer className="text-xs text-neutral-600 pb-8">Remove before production launch.</footer>
      </div>
    </div>
  )
}
