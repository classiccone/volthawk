'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, Play, X, AlertTriangle, Search, StickyNote } from 'lucide-react'

const SEVERITY_BADGE = {
  critical: 'text-critical border-critical',
  high: 'text-high border-high',
  moderate: 'text-moderate border-moderate',
  low: 'text-low border-low',
}
const SEVERITY_ORDER = { critical: 0, high: 1, moderate: 2, low: 3 }
const SEVERITY_OPTIONS = ['critical', 'high', 'moderate', 'low']

const ANOMALY_TYPES = [
  { key: 'all', label: 'All types' },
  { key: 'vegetation_encroachment', label: 'Vegetation' },
  { key: 'insulator_damage', label: 'Insulator' },
  { key: 'structural_corrosion', label: 'Structural' },
]

const COL = 'grid grid-cols-[2rem_4rem_5.5rem_5.5rem_6.5rem_1fr_10rem_6rem] gap-x-2.5 items-center'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function priorityLabel(hours) {
  if (hours <= 24) return 'Immediate'
  if (hours <= 720) return 'Within 30 days'
  if (hours <= 2160) return 'Within 90 days'
  return 'Next annual cycle'
}

function anomalyLabel(type) {
  const map = {
    structural_corrosion: 'Structural Corrosion',
    vegetation_encroachment: 'Vegetation Encroachment',
    insulator_damage: 'Insulator Damage',
  }
  return map[type] || type?.replace(/_/g, ' ')
}

function SortArrow({ column, sortCol, sortAsc }) {
  if (sortCol !== column) return <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-30" />
  return sortAsc
    ? <ChevronUp className="w-3 h-3 text-text-primary" />
    : <ChevronDown className="w-3 h-3 text-text-primary" />
}

export default function FindingsTable({ findings, escalations, videoUrl, onUpdateFinding }) {
  const [expandedId, setExpandedId] = useState(null)
  const [videoTime, setVideoTime] = useState(null)
  const [pendingNoteIds, setPendingNoteIds] = useState(new Set())
  const saveTimersRef = useRef({})

  // Filters
  const [severityFilter, setSeverityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Sort
  const [sortCol, setSortCol] = useState('severity')
  const [sortAsc, setSortAsc] = useState(true)

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortAsc(prev => !prev)
    } else {
      setSortCol(col)
      setSortAsc(true)
    }
  }

  // Severity counts (unfiltered)
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, moderate: 0, low: 0 }
    findings.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++ })
    return counts
  }, [findings])

  // Filter + sort
  const filtered = useMemo(() => {
    let list = findings
    if (severityFilter !== 'all') list = list.filter(f => f.severity === severityFilter)
    if (typeFilter !== 'all') list = list.filter(f => f.anomaly_type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f =>
        (f.condition || '').toLowerCase().includes(q) ||
        (f.query_used || '').toLowerCase().includes(q) ||
        String(f.id).includes(q) ||
        `f-${String(f.id).padStart(3, '0')}`.includes(q)
      )
    }
    const sorted = [...list]
    sorted.sort((a, b) => {
      let cmp = 0
      if (sortCol === 'severity') cmp = (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
      else if (sortCol === 'id') cmp = a.id - b.id
      else if (sortCol === 'segment') cmp = a.start_time - b.start_time
      return sortAsc ? cmp : -cmp
    })
    return sorted
  }, [findings, severityFilter, typeFilter, search, sortCol, sortAsc])

  const flushNotesSave = useCallback((id) => {
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id])
      delete saveTimersRef.current[id]
    }
    const ts = new Date().toISOString()
    onUpdateFinding(id, { notes_updated_at: ts })
    setPendingNoteIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }, [onUpdateFinding])

  const handleNotesChange = useCallback((id, value) => {
    const ts = new Date().toISOString()
    onUpdateFinding(id, { notes: value, notes_updated_at: ts })
    setPendingNoteIds(prev => new Set(prev).add(id))
    if (saveTimersRef.current[id]) clearTimeout(saveTimersRef.current[id])
    saveTimersRef.current[id] = setTimeout(() => {
      delete saveTimersRef.current[id]
      setPendingNoteIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }, 800)
  }, [onUpdateFinding])

  const handleClearNotes = useCallback((id) => {
    if (!confirm('Clear inspector notes for this finding?')) return
    onUpdateFinding(id, { notes: '', notes_updated_at: null })
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id])
      delete saveTimersRef.current[id]
    }
    setPendingNoteIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }, [onUpdateFinding])

  function formatNoteTime(iso) {
    if (!iso) return null
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } catch { return null }
  }

  const getEscalation = (findingId) => escalations.find(e => e.linked_finding_id === findingId)

  return (
    <>
      <div className="bg-surface-1 border border-border rounded-md overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Inspection Findings</h3>
          <span className="text-xs text-text-secondary font-mono">
            {filtered.length === findings.length
              ? `${findings.length} findings`
              : `${filtered.length} of ${findings.length} findings`}
          </span>
        </div>

        {/* Control bar */}
        <div className="px-5 py-3 border-b border-border space-y-2.5">
          {/* Severity chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide rounded-md border transition-colors ${
                severityFilter === 'all'
                  ? 'bg-surface-2 text-text-primary border-border'
                  : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-2/50'
              }`}
            >
              All {findings.length}
            </button>
            {SEVERITY_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setSeverityFilter(severityFilter === s ? 'all' : s)}
                className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide rounded-md border transition-colors ${
                  severityFilter === s
                    ? SEVERITY_BADGE[s]
                    : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-2/50'
                }`}
              >
                {s} {severityCounts[s]}
              </button>
            ))}

            <span className="w-px h-5 bg-border mx-1" />

            {/* Type dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-[11px] font-medium bg-surface-1 border border-border rounded-md text-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {ANOMALY_TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>

            <span className="w-px h-5 bg-border mx-1" />

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-secondary absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search findings..."
                className="pl-7 pr-3 py-1 w-48 text-[11px] bg-surface-1 border border-border rounded-md text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className={`px-5 py-2 border-b border-border bg-surface-2/40 ${COL}`}>
          <span />
          <button onClick={() => handleSort('id')} className="group flex items-center gap-1 text-[10px] text-text-secondary uppercase tracking-wider font-semibold hover:text-text-primary transition-colors">
            ID <SortArrow column="id" sortCol={sortCol} sortAsc={sortAsc} />
          </button>
          <button onClick={() => handleSort('severity')} className="group flex items-center gap-1 text-[10px] text-text-secondary uppercase tracking-wider font-semibold hover:text-text-primary transition-colors">
            Severity <SortArrow column="severity" sortCol={sortCol} sortAsc={sortAsc} />
          </button>
          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Type</span>
          <button onClick={() => handleSort('segment')} className="group flex items-center gap-1 text-[10px] text-text-secondary uppercase tracking-wider font-semibold hover:text-text-primary transition-colors">
            Segment <SortArrow column="segment" sortCol={sortCol} sortAsc={sortAsc} />
          </button>
          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Condition</span>
          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">NERC Ref</span>
          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Window</span>
        </div>

        {/* Rows */}
        <div>
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-text-secondary">No findings match the current filters.</div>
          )}
          {filtered.map((f, idx) => {
            const expanded = expandedId === f.id
            const escalation = getEscalation(f.id)
            const hasNotes = f.notes && f.notes.trim().length > 0
            return (
              <div key={f.id} className={idx > 0 ? 'border-t border-border/50' : ''}>
                <button
                  onClick={() => setExpandedId(expanded ? null : f.id)}
                  className={`w-full px-5 py-2.5 text-left transition-colors ${COL} ${expanded ? 'bg-surface-2/30' : 'hover:bg-surface-2/20'}`}
                >
                  <div className="flex items-center gap-1">
                    {expanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
                      : <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />}
                  </div>
                  <span className="text-xs font-mono text-text-secondary">F-{String(f.id).padStart(3, '0')}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded border ${SEVERITY_BADGE[f.severity]}`}>
                      {f.severity}
                    </span>
                    {escalation && <AlertTriangle className="w-3 h-3 text-critical" />}
                    {hasNotes && !expanded && <StickyNote className="w-3 h-3 text-text-secondary" title="Has inspector notes" />}
                  </div>
                  <span className="text-xs text-text-primary capitalize truncate">{anomalyLabel(f.anomaly_type)}</span>
                  <span className="text-xs font-mono text-text-secondary">{formatTime(f.start_time)} – {formatTime(f.end_time)}</span>
                  <p className="text-xs text-text-secondary truncate">{f.condition || f.query_used}</p>
                  <span className="text-[11px] text-text-secondary truncate">{f.nerc_reference}</span>
                  <span className="text-[11px] text-text-secondary">{priorityLabel(f.priority_hours)}</span>
                </button>

                {/* ── Expanded detail (approved — unchanged) ── */}
                {expanded && (
                  <div className="border-t border-border/40 bg-surface-0/50 px-5 py-5 pl-12">
                    <div className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm mb-5">
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Finding ID</p>
                        <p className="text-text-primary font-mono">F-{String(f.id).padStart(3, '0')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Anomaly Type</p>
                        <p className="text-text-primary">{anomalyLabel(f.anomaly_type)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Asset Class</p>
                        <p className="text-text-primary capitalize">{f.asset_type?.replace(/_/g, ' ') || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Video Segment</p>
                        <div className="flex items-center gap-2">
                          <span className="text-text-primary font-mono">{formatTime(f.start_time)} – {formatTime(f.end_time)}</span>
                          {videoUrl && (
                            <button
                              onClick={() => setVideoTime(f.start_time)}
                              className="text-accent hover:text-accent/80 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Severity</p>
                        <select
                          value={f.severity}
                          onChange={(e) => onUpdateFinding(f.id, { severity: e.target.value })}
                          className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded border cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent ${SEVERITY_BADGE[f.severity]}`}
                        >
                          {SEVERITY_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Compliance Ref</p>
                        <p className="text-text-primary">{f.nerc_reference}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Response Window</p>
                        <p className="text-text-primary">{priorityLabel(f.priority_hours)} <span className="text-text-secondary">({f.priority_hours}h)</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Detection Confidence</p>
                        <p className="text-text-primary font-mono">{Math.round((f.pegasus_confidence || 0) * 100)}% <span className="text-text-secondary text-xs font-sans">/ sim {f.marengo_score?.toFixed(3)}</span></p>
                      </div>
                    </div>

                    <div className="h-px bg-border mb-4" />

                    <div className="mb-4">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1.5">Condition Assessment</p>
                      <p className="text-sm text-text-primary leading-relaxed">{f.condition || f.query_used}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1.5">Recommended Action</p>
                      <p className="text-sm text-text-primary leading-relaxed">{f.recommended_action}</p>
                    </div>

                    {escalation && (
                      <div className="flex items-start gap-2.5 px-3 py-2.5 mb-4 border border-critical/20 rounded">
                        <AlertTriangle className="w-3.5 h-3.5 text-critical shrink-0 mt-0.5" />
                        <p className="text-xs text-critical leading-relaxed">
                          <span className="font-semibold">Maintenance Escalation</span> — Tower {escalation.tower_id} maintenance is {escalation.maintenance_status} (last inspected {escalation.last_inspection}). Combined with this active anomaly, recommend immediate priority upgrade per FAC-501-3.
                        </p>
                      </div>
                    )}

                    <div className="h-px bg-border mb-4" />

                    <div>
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1.5">Inspector Notes</p>
                      <textarea
                        value={f.notes || ''}
                        onChange={(e) => handleNotesChange(f.id, e.target.value)}
                        placeholder="Add field observations, severity override reasoning, follow-up tasks..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm bg-surface-1 border border-border rounded text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] font-mono text-text-secondary">
                          {pendingNoteIds.has(f.id)
                            ? 'Saving...'
                            : f.notes_updated_at
                              ? `Saved · ${formatNoteTime(f.notes_updated_at)}`
                              : '\u00A0'}
                        </span>
                        <div className="flex items-center gap-2">
                          {(f.notes || '').trim() && pendingNoteIds.has(f.id) && (
                            <button
                              onClick={() => flushNotesSave(f.id)}
                              className="px-2 py-0.5 text-[11px] text-text-secondary border border-border rounded hover:bg-surface-2 transition-colors"
                            >
                              Save now
                            </button>
                          )}
                          {(f.notes || '').trim() && (
                            <button
                              onClick={() => handleClearNotes(f.id)}
                              className="px-2 py-0.5 text-[11px] text-text-secondary border border-border rounded hover:bg-surface-2 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {videoTime !== null && videoUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-8" onClick={() => setVideoTime(null)}>
          <div className="bg-surface-1 rounded-md shadow-xl border border-border max-w-3xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h4 className="text-sm font-semibold text-text-primary">Evidence Playback — {formatTime(videoTime)}</h4>
              <button onClick={() => setVideoTime(null)} className="p-1 rounded-lg hover:bg-surface-2 text-text-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <video controls autoPlay src={`${videoUrl}#t=${videoTime}`} className="w-full rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
