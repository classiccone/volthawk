'use client'

import { AlertTriangle } from 'lucide-react'

export default function MaintenanceCrossRef({ findings, maintenance }) {
  const escalated = maintenance
    .filter(m => (m.maintenance_status === 'deferred' || m.maintenance_status === 'overdue') && m.linked_finding_id)
    .map(m => ({ ...m, finding: findings.find(f => f.id === m.linked_finding_id) }))
    .filter(e => e.finding)

  if (escalated.length === 0) return null

  return (
    <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-critical" />
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Maintenance Cross-Reference</h3>
        <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-critical/20 text-critical rounded">{escalated.length} ESCALATED</span>
      </div>
      <div className="divide-y divide-border">
        {escalated.map(e => (
          <div key={e.tower_id} className="px-5 py-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-mono font-bold text-text-primary">{e.tower_id}</span>
                <span className="text-text-secondary text-sm ml-3">{e.location_description}</span>
              </div>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${e.maintenance_status === 'overdue' ? 'bg-critical/20 text-critical' : 'bg-high/20 text-high'}`}>
                {e.maintenance_status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
              <div><p className="text-text-secondary text-xs">Last Inspection</p><p className="font-mono">{e.last_inspection}</p></div>
              <div><p className="text-text-secondary text-xs">Years in Service</p><p className="font-mono">{e.years_in_service}</p></div>
              <div><p className="text-text-secondary text-xs">Voltage</p><p className="font-mono">{e.voltage}</p></div>
              <div><p className="text-text-secondary text-xs">Linked Finding</p><p className="font-mono">#{e.finding.id} — {e.finding.anomaly_type.replace(/_/g, ' ')}</p></div>
            </div>
            <div className="p-3 bg-critical/10 border border-critical/20 rounded-lg text-sm text-critical flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <span className="font-bold">ESCALATED</span> — Tower {e.tower_id} has {e.maintenance_status} maintenance (last inspected {e.last_inspection}) + active visual anomaly detected. Recommend immediate priority upgrade.
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
