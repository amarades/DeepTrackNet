/**
 * Zustand store — global application state for DeepTrackNet
 */
import { create } from 'zustand'

export interface ZoneData {
  count: number
  density: number
  risk: 'low' | 'medium' | 'high' | 'critical'
  row: number
  col: number
}

export interface BoundingBox {
  id: number
  x: number
  y: number
  w: number
  h: number
  confidence: number
}

export interface FrameData {
  camera_id: string
  camera_name: string
  timestamp: string
  people_count: number
  density_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  zone_data: Record<string, ZoneData>
  bounding_boxes: BoundingBox[]
  tracked_ids: { active: number; entries: number; exits: number }
  avg_speed: number
  flow_direction: string
  anomaly_score: number
  surge_active: boolean
  heatmap_data: number[][]
  frame_width: number
  frame_height: number
}

export interface Recommendation {
  priority: 'immediate' | 'urgent' | 'advisory' | 'info'
  action: string
  icon: string
}

export interface Alert {
  id: number
  camera_id: string
  camera_name: string
  severity: 'info' | 'warning' | 'high' | 'critical'
  alert_type: string
  message: string
  density_score: number
  people_count: number
  location: string
  is_acknowledged: boolean
  created_at: string
  ai_reasoning?: string
  shap_values?: Record<string, number>
}

export interface ForecastPoint {
  timestamp: string
  horizon_minutes: number
  predicted_count: number
  predicted_density: number
  confidence_lower: number
  confidence_upper: number
  stampede_risk_score: number
  congestion_probability: number
}

interface CrowdStore {
  // Active camera
  selectedCamera: string
  setSelectedCamera: (id: string) => void

  // Live frame data (per camera)
  frames: Record<string, FrameData>
  updateFrame: (cameraId: string, data: FrameData) => void

  // Recommendations
  recommendations: Recommendation[]
  setRecommendations: (recs: Recommendation[]) => void

  // Alerts
  alerts: Alert[]
  setAlerts: (alerts: Alert[]) => void
  acknowledgeAlert: (id: number) => void

  // Forecast
  forecast: ForecastPoint[]
  setForecast: (fc: ForecastPoint[]) => void

  // WebSocket connection state
  wsConnected: boolean
  setWsConnected: (v: boolean) => void

  // UI state
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useCrowdStore = create<CrowdStore>((set) => ({
  selectedCamera: 'CAM_01',
  setSelectedCamera: (id) => set({ selectedCamera: id }),

  frames: {},
  updateFrame: (cameraId, data) =>
    set((state) => ({ frames: { ...state.frames, [cameraId]: data } })),

  recommendations: [],
  setRecommendations: (recs) => set({ recommendations: recs }),

  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, is_acknowledged: true } : a
      ),
    })),

  forecast: [],
  setForecast: (fc) => set({ forecast: fc }),

  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
