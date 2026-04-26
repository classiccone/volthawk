export function exportCSV(findings) {
  const headers = [
    'ID', 'Anomaly Type', 'Severity', 'Start Time', 'End Time',
    'Marengo Score', 'Asset Type', 'Condition', 'NERC Reference',
    'Priority Hours', 'Pegasus Confidence', 'Recommended Action',
  ]

  const rows = findings.map(f => [
    f.id,
    f.anomaly_type,
    f.severity,
    f.start_time,
    f.end_time,
    f.marengo_score,
    f.asset_type || '',
    `"${(f.condition || f.query_used || '').replace(/"/g, '""')}"`,
    `"${(f.nerc_reference || '').replace(/"/g, '""')}"`,
    f.priority_hours || '',
    f.pegasus_confidence || '',
    `"${(f.recommended_action || '').replace(/"/g, '""')}"`,
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `volthawk-findings-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
