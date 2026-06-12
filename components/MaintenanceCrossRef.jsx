'use client'

import { AlertTriangle } from 'lucide-react'

export default function MaintenanceCrossRef({ findings, maintenance }) {
  const escalated = maintenance
    .filter(m => (m.maintenance_status === 'deferred' || m.maintenance_status === 'overdue') && m.linked_finding_id)
    .map(m => ({ ...m, finding: findings.find(f => f.id === m.linked_finding_id) }))
    .filter(e => e.finding)

  if (escalated.length === 0) return null

  return (
    <div className="bg-surface-1 border border-border rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-critical" />
        <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Maintenance Cross-Reference</h3>
        <span className="ml-auto px-2 py-0.5 text-[11px] font-bold text-critical border border-critical rounded">{escalated.length} ESCALATED</span>
      </div>
      <div className="divide-y divide-border">
        {escalated.map(e => (
          <div key={e.tower_id} className="px-4 py-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-mono font-bold text-text-primary">{e.tower_id}</span>
                <span className="text-text-secondary text-xs ml-3">{e.location_description}</span>
              </div>
              <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${e.maintenance_status === 'overdue' ? 'text-critical border-critical' : 'text-high border-high'}`}>
                {e.maintenance_status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-xs mb-3">
              <div><p className="text-text-secondary text-[10px] uppercase tracking-wider">Last Inspection</p><p className="font-mono">{e.last_inspection}</p></div>
              <div><p className="text-text-secondary text-[10px] uppercase tracking-wider">Years in Service</p><p className="font-mono">{e.years_in_service}</p></div>
              <div><p className="text-text-secondary text-[10px] uppercase tracking-wider">Voltage</p><p className="font-mono">{e.voltage}</p></div>
              <div><p className="text-text-secondary text-[10px] uppercase tracking-wider">Linked Finding</p><p className="font-mono">#{e.finding.id} — {e.finding.anomaly_type.replace(/_/g, ' ')}</p></div>
            </div>
            <div className="p-2.5 border border-critical/20 rounded text-xs text-critical flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
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
