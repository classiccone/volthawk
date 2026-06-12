'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const SEVERITY_COLORS = { critical: '#dc2626', high: '#ea580c', moderate: '#ca8a04', low: '#16a34a' }
const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low']

export default function SeverityChart({ findings }) {
  const counts = {}
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1

  const data = SEVERITY_ORDER
    .map(s => ({ severity: s.charAt(0).toUpperCase() + s.slice(1), count: counts[s] || 0, key: s }))

  return (
    <div className="bg-surface-1 border border-border rounded-md p-4">
      <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-3">Severity Distribution</h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 0, bottom: 0 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="severity" tick={{ fill: '#111827', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
          <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 4, color: '#111827', fontSize: 12 }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={18}>
            {data.map(entry => <Cell key={entry.key} fill={SEVERITY_COLORS[entry.key]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
