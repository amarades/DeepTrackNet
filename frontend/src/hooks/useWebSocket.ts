/**
 * WebSocket hook — connects to DeepTrackNet live stream
 * Handles auto-reconnect, frame data updates, and connection state
 */
import { useEffect, useRef, useCallback } from 'react'
import { useCrowdStore } from '@/store/crowdStore'
import toast from 'react-hot-toast'

const WS_BASE = 'ws://localhost:8000/api/v1/stream/ws'
const RECONNECT_DELAY = 3000

export function useWebSocket(cameraId: string) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const { updateFrame, setRecommendations, setWsConnected } = useCrowdStore()

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    ws.current = new WebSocket(`${WS_BASE}/${cameraId}?fps=2`)

    ws.current.onopen = () => {
      setWsConnected(true)
      console.log(`[WS] Connected to ${cameraId}`)
    }

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'frame') {
          updateFrame(cameraId, msg.data)
          if (msg.recommendations) {
            setRecommendations(msg.recommendations)
          }
          // Trigger toast alert for surges
          if (msg.data.surge_active && msg.data.risk_level === 'critical') {
            toast.error(`🚨 CRITICAL: Crowd surge at ${msg.data.camera_name}!`, { duration: 6000 })
          }
        }
      } catch (e) {
        console.warn('[WS] Parse error:', e)
      }
    }

    ws.current.onclose = () => {
      setWsConnected(false)
      console.log(`[WS] Disconnected from ${cameraId} — reconnecting in ${RECONNECT_DELAY}ms`)
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
    }

    ws.current.onerror = (err) => {
      console.warn('[WS] Error:', err)
      ws.current?.close()
    }
  }, [cameraId, updateFrame, setRecommendations, setWsConnected])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
      setWsConnected(false)
    }
  }, [connect])
}
