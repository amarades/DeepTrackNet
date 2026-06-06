/**
 * Live Feed Component — renders a canvas-based simulated video feed
 * showing bounding boxes, crowd count, and detection overlay
 */
import { useEffect, useRef } from 'react'
import { useCrowdStore } from '@/store/crowdStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import clsx from 'clsx'

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444'
}

export default function LiveFeed({ cameraId }: { cameraId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { frames } = useCrowdStore()
  const frame = frames[cameraId]

  // Connect WebSocket
  useWebSocket(cameraId)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame) return
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = '#0a0b1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Simulated camera grid overlay
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
    }

    // Zone overlays
    const zoneW = canvas.width / 4
    const zoneH = canvas.height / 3
    Object.values(frame.zone_data).forEach((zone: any) => {
      const alpha = zone.density * 0.25
      ctx.fillStyle = `${RISK_COLORS[zone.risk]}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
      ctx.fillRect(zone.col * zoneW, zone.row * zoneH, zoneW, zoneH)
    })

    // Bounding boxes
    const riskColor = RISK_COLORS[frame.risk_level] || '#22c55e'
    frame.bounding_boxes.forEach((box) => {
      const scaleX = canvas.width / (frame.frame_width || 1280)
      const scaleY = canvas.height / (frame.frame_height || 720)
      const bx = box.x * scaleX, by = box.y * scaleY
      const bw = box.w * scaleX, bh = box.h * scaleY

      // Box
      ctx.strokeStyle = riskColor
      ctx.lineWidth = 1.5
      ctx.strokeRect(bx, by, bw, bh)

      // Confidence label
      ctx.fillStyle = riskColor
      ctx.fillRect(bx, by - 14, 34, 14)
      ctx.fillStyle = '#000'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillText(`${Math.round(box.confidence * 100)}%`, bx + 2, by - 3)
    })

    // Top overlay — camera info
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, canvas.width, 36)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px Inter, sans-serif'
    ctx.fillText(`${frame.camera_name}  ·  ${frame.camera_id}`, 10, 22)

    // Count badge (top right)
    const countText = `${frame.people_count} people`
    ctx.fillStyle = riskColor
    ctx.fillRect(canvas.width - 100, 8, 92, 22)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.fillText(countText, canvas.width - 96, 23)

    // Surge warning
    if (frame.surge_active) {
      ctx.fillStyle = 'rgba(239,68,68,0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 18px Inter, sans-serif'
      ctx.fillText('⚠ SURGE DETECTED', canvas.width / 2 - 90, canvas.height / 2)
    }

    // Timestamp
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '10px JetBrains Mono, monospace'
    const ts = new Date(frame.timestamp).toLocaleTimeString()
    ctx.fillText(ts, 10, canvas.height - 8)

    // Anomaly score
    if (frame.anomaly_score > 0.5) {
      ctx.fillStyle = '#f97316'
      ctx.font = 'bold 10px Inter, sans-serif'
      ctx.fillText(`ANOMALY: ${(frame.anomaly_score * 100).toFixed(0)}%`, 10, canvas.height - 24)
    }

  }, [frame, cameraId])

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-sm font-semibold text-white">Live Feed</span>
          <span className="text-xs text-slate-500">
            {frame ? `· ${frame.camera_name}` : '· Connecting...'}
          </span>
        </div>
        {frame && (
          <span className={clsx('risk-badge', `risk-${frame.risk_level}`)}>
            {frame.risk_level}
          </span>
        )}
      </div>
      <div className="relative bg-surface-900">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {!frame && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-900">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Connecting to stream...</p>
            </div>
          </div>
        )}
      </div>
      {/* Bottom stats bar */}
      {frame && (
        <div className="grid grid-cols-4 divide-x divide-white/5 border-t border-white/5">
          {[
            { label: 'Count', value: frame.people_count },
            { label: 'Density', value: `${(frame.density_score * 100).toFixed(0)}%` },
            { label: 'Speed', value: `${frame.avg_speed}m/s` },
            { label: 'Flow', value: frame.flow_direction },
          ].map(({ label, value }) => (
            <div key={label} className="px-3 py-2 text-center">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</p>
              <p className="text-sm font-semibold text-slate-200 font-mono">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
