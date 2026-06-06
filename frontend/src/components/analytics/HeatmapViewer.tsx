/**
 * Heatmap Viewer — canvas-based density heatmap using zone data
 */
import { useEffect, useRef } from 'react'
import { useCrowdStore } from '@/store/crowdStore'

const GRADIENT_STOPS = [
  [0.0,  '#1e3a2f'],  // dark green (empty)
  [0.35, '#22c55e'],  // green (low)
  [0.55, '#eab308'],  // yellow (medium)
  [0.75, '#f97316'],  // orange (high)
  [0.90, '#ef4444'],  // red (critical)
  [1.0,  '#7f1d1d'],  // dark red (max)
]

function densityToColor(d: number): string {
  for (let i = GRADIENT_STOPS.length - 1; i >= 0; i--) {
    if (d >= GRADIENT_STOPS[i][0]) return GRADIENT_STOPS[i][1]
  }
  return GRADIENT_STOPS[0][1]
}

export default function HeatmapViewer({ cameraId }: { cameraId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { frames } = useCrowdStore()
  const frame = frames[cameraId]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame?.heatmap_data) return
    const ctx = canvas.getContext('2d')!
    const matrix = frame.heatmap_data  // 3 rows x 4 cols
    const rows = matrix.length
    const cols = matrix[0]?.length || 4
    const cellW = canvas.width / cols
    const cellH = canvas.height / rows

    ctx.fillStyle = '#0a0b1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    matrix.forEach((row, r) => {
      row.forEach((density, c) => {
        const x = c * cellW, y = r * cellH
        const color = densityToColor(density)

        // Cell fill with alpha based on density
        ctx.globalAlpha = 0.3 + density * 0.7
        ctx.fillStyle = color
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4)

        // Cell border
        ctx.globalAlpha = 0.2
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4)

        // Density label
        ctx.globalAlpha = 1
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = 'bold 13px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`${(density * 100).toFixed(0)}%`, x + cellW / 2, y + cellH / 2 + 5)

        // Zone label
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.font = '9px Inter, sans-serif'
        ctx.fillText(`Z${r}${c}`, x + cellW / 2, y + cellH / 2 + 20)
      })
    })

    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
  }, [frame, cameraId])

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Density Heatmap</h3>
        <div className="flex items-center gap-3 text-[10px]">
          {[['#22c55e','Safe'],['#eab308','Moderate'],['#f97316','High'],['#ef4444','Critical']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: c }} />
              <span className="text-slate-500">{l}</span>
            </div>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={480}
        height={270}
        className="w-full"
      />
    </div>
  )
}
