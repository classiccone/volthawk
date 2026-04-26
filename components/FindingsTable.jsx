'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Play, X } from 'lucide-react'

const SEVERITY_BADGE = {
  critical: 'bg-critical/10 text-critical border-critical/30',
  high: 'bg-high/10 text-high border-high/30',
  moderate: 'bg-moderate/10 text-moderate border-moderate/30',
  low: 'bg-low/10 text-low border-low/30',
}
const SEVERITY_ORDER = { critical: 0, high: 1, moderate: 2, low: 3 }

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const SEVERITY_OPTIONS = ['critical', 'high', 'moderate', 'low']

export default function FindingsTable({ findings, escalations, videoUrl, onUpdateFinding }) {
  const [expandedId, setExpandedId] = useState(null)
  const [videoTime, setVideoTime] = useState(null)
  const sorted = [...findings].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4))
  const getEscalation = (findingId) => escalations.find(e => e.linked_finding_id === findingId)

  return (
    <>
      <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Inspection Findings</h3>
        </div>
        <div className="divide-y divide-border">
          {sorted.map(f => {
            const expanded = expandedId === f.id
            const escalation = getEscalation(f.id)
            return (
              <div key={f.id}>
                <button
                  onClick={() => setExpandedId(expanded ? null : f.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-surface-2/50 transition-colors text-left"
                >
                  {expanded ? <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" /> : <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />}
                  <span className={`shrink-0 px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-md border ${SEVERITY_BADGE[f.severity]}`}>
                    {f.severity}
                  </span>
                  <span className="text-sm font-medium text-text-primary w-44 shrink-0">{f.anomaly_type.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-mono text-text-secondary w-28 shrink-0">{formatTime(f.start_time)} – {formatTime(f.end_time)}</span>
                  <span className="text-sm text-text-secondary truncate flex-1">{f.condition || f.query_used}</span>
                  {escalation && (
                    <span className="shrink-0 px-2 py-0.5 text-xs font-bold bg-critical/10 text-critical rounded border border-critical/30">ESCALATED</span>
                  )}
                </button>
                {expanded && (
                  <div className="px-5 pb-4 pl-14 space-y-3 bg-surface-0/50">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-text-secondary text-xs uppercase tracking-wider">Severity:</span>
                      <select
                        value={f.severity}
                        onChange={(e) => onUpdateFinding(f.id, { severity: e.target.value })}
                        className={`px-2 py-1 text-xs font-bold uppercase rounded-md border bg-surface-2 text-text-primary cursor-pointer ${SEVERITY_BADGE[f.severity]}`}
                      >
                        {SEVERITY_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Condition</p>
                        <p className="text-text-primary">{f.condition || f.query_used}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Recommended Action</p>
                        <p className="text-text-primary">{f.recommended_action}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-text-secondary text-xs uppercase tracking-wider">NERC Ref: </span>
                        <span className="text-text-primary">{f.nerc_reference}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary text-xs uppercase tracking-wider">Marengo: </span>
                        <span className="font-mono text-text-primary">{f.marengo_score}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary text-xs uppercase tracking-wider">Pegasus: </span>
                        <span className="font-mono text-text-primary">{f.pegasus_confidence}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary text-xs uppercase tracking-wider">Priority: </span>
                        <span className="font-mono text-text-primary">{f.priority_hours}h</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Inspector Notes</p>
                      <input
                        type="text"
                        value={f.notes || ''}
                        onChange={(e) => onUpdateFinding(f.id, { notes: e.target.value })}
                        placeholder="Add inspector notes..."
                        className="w-full px-3 py-2 text-sm bg-surface-1 border border-border rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    {videoUrl ? (
                      <button
                        onClick={() => setVideoTime(f.start_time)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Play Evidence @ {formatTime(f.start_time)}
                      </button>
                    ) : (
                      <span className="text-xs text-text-secondary">
                        Timestamp: {formatTime(f.start_time)} – {formatTime(f.end_time)}
                      </span>
                    )}
                    {escalation && (
                      <div className="mt-2 p-3 bg-critical/5 border border-critical/20 rounded-lg text-sm text-critical">
                        <span className="font-bold">ESCALATED</span> — Tower {escalation.tower_id} has {escalation.maintenance_status} maintenance (last inspected {escalation.last_inspection}) + active visual anomaly detected. Recommend immediate priority upgrade.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {videoTime !== null && videoUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-8" onClick={() => setVideoTime(null)}>
          <div className="bg-surface-1 rounded-2xl shadow-2xl border border-border max-w-3xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h4 className="text-sm font-semibold text-text-primary">Evidence Playback — {formatTime(videoTime)}</h4>
              <button onClick={() => setVideoTime(null)} className="p-1 rounded-lg hover:bg-surface-2 text-text-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <video
                controls
                autoPlay
                src={`${videoUrl}#t=${videoTime}`}
                className="w-full rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
