'use client'

import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const SEVERITY_COLORS = { critical: '#dc2626', high: '#ea580c', moderate: '#ca8a04', low: '#16a34a' }
const ANOMALY_LABELS = { insulator_damage: 'Insulator Damage', vegetation_encroachment: 'Vegetation', structural_corrosion: 'Structural Corrosion' }

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function DetectionTimeline({ findings }) {
  // Build ordered list of anomaly types present in findings
  const anomalyTypes = [...new Set(findings.map(f => f.anomaly_type))]

  const data = findings.map(f => ({
    x: f.start_time,
    y: anomalyTypes.indexOf(f.anomaly_type),
    severity: f.severity,
    id: f.id,
    type: ANOMALY_LABELS[f.anomaly_type] || f.anomaly_type,
    time: `${formatTime(f.start_time)} - ${formatTime(f.end_time)}`,
  }))

  return (
    <div className="bg-surface-1 border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Detection Timeline</h3>
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ left: 30, right: 20, top: 10, bottom: 10 }}>
          <XAxis type="number" dataKey="x" domain={[0, 'dataMax + 10']} tickFormatter={formatTime} tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: '#d1d5db' }} tickLine={false} label={{ value: 'Video Timestamp', position: 'bottom', fill: '#6b7280', fontSize: 11, offset: -2 }} />
          <YAxis type="number" dataKey="y" domain={[-0.5, anomalyTypes.length - 0.5]} ticks={anomalyTypes.map((_, i) => i)} tickFormatter={i => ANOMALY_LABELS[anomalyTypes[i]] || anomalyTypes[i] || ''} tick={{ fill: '#111827', fontSize: 12 }} axisLine={false} tickLine={false} width={130} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm">
                  <p className="font-semibold">Finding #{d.id}</p>
                  <p className="text-text-secondary">{d.type}</p>
                  <p className="text-text-secondary">{d.time}</p>
                  <p className="font-mono text-xs mt-1" style={{ color: SEVERITY_COLORS[d.severity] }}>{d.severity.toUpperCase()}</p>
                </div>
              )
            }}
          />
          <Scatter data={data}>
            {data.map((entry, i) => <Cell key={i} fill={SEVERITY_COLORS[entry.severity]} r={8} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
