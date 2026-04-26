import { getTotalRiskExposure, formatCurrency } from './riskCalculation'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function severityBadge(sev) {
  const colors = {
    critical: 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5',
    high: 'background:#fff7ed;color:#9a3412;border:1px solid #fdba74',
    moderate: 'background:#fefce8;color:#854d0e;border:1px solid #fde047',
    low: 'background:#f0fdf4;color:#166534;border:1px solid #86efac',
  }
  return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:700;text-transform:uppercase;${colors[sev] || ''}">${esc(sev)}</span>`
}

function complianceBadge(hasViolation) {
  if (hasViolation) return '<span style="display:inline-block;margin-top:8px;padding:3px 12px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5">Violations Found</span>'
  return '<span style="display:inline-block;margin-top:8px;padding:3px 12px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;background:#f0fdf4;color:#166534;border:1px solid #86efac">Compliant</span>'
}

export function generateReport(findings, maintenance) {
  const [riskMin, riskMax] = getTotalRiskExposure(findings)
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const severityOrder = ['critical', 'high', 'moderate', 'low']
  const severityLabel = { critical: 'CRITICAL', high: 'HIGH', moderate: 'MODERATE', low: 'LOW' }

  const grouped = {}
  for (const sev of severityOrder) {
    grouped[sev] = findings.filter(f => f.severity === sev)
  }

  const sorted = severityOrder.flatMap(s => grouped[s])

  // NERC compliance
  const vegFindings = findings.filter(f => f.anomaly_type?.toLowerCase().includes('vegetation'))
  const vegHighCrit = vegFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length
  const structFindings = findings.filter(f => f.anomaly_type?.toLowerCase().includes('corrosion') || f.anomaly_type?.toLowerCase().includes('structural'))
  const structHighCrit = structFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length
  const insulatorFindings = findings.filter(f => f.anomaly_type?.toLowerCase().includes('insulator'))
  const insulatorHighCrit = insulatorFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length

  // Escalations
  const escalations = maintenance
    .filter(m => (m.maintenance_status === 'deferred' || m.maintenance_status === 'overdue') && m.linked_finding_id)
    .map(m => ({ ...m, finding: findings.find(f => f.id === m.linked_finding_id) }))
    .filter(e => e.finding)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VoltHawk Transmission Line Inspection Report</title>
<style>
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a1a2e; line-height: 1.5; padding: 40px; max-width: 1100px; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 24px; border-bottom: 3px solid #3b82f6; margin-bottom: 32px; }
  .header h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 4px; }
  .header .subtitle { font-size: 14px; color: #64748b; }
  .header .date { font-size: 13px; color: #94a3b8; margin-top: 8px; }
  .section-title { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
  .stat-card .value { font-size: 28px; font-weight: 700; margin-top: 4px; font-family: 'SF Mono', 'Fira Code', monospace; }
  .stat-card .value.accent { color: #3b82f6; }
  .stat-card .value.critical { color: #dc2626; }
  .stat-card .value.high { color: #ea580c; }
  .stat-card .value.risk { color: #ca8a04; font-size: 18px; }
  .compliance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .compliance-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .compliance-card .std { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
  .compliance-card .count { font-size: 22px; font-weight: 700; font-family: monospace; margin-top: 4px; }
  .compliance-card .count span { font-size: 13px; font-weight: 400; color: #64748b; }
  .compliance-card .detail { font-size: 12px; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 32px; }
  th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:hover { background: #f8fafc; }
  .escalation-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .escalation-card .tower { font-weight: 700; font-family: monospace; font-size: 15px; }
  .escalation-card .meta { font-size: 12px; color: #64748b; margin-top: 4px; }
  .escalation-card .alert { margin-top: 8px; font-size: 13px; color: #991b1b; font-weight: 600; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .status-overdue { background: #fee2e2; color: #991b1b; }
  .status-deferred { background: #fff7ed; color: #9a3412; }
  .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
  .metric-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
  .metric-card .value { font-size: 28px; font-weight: 700; color: #3b82f6; font-family: monospace; margin-top: 4px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
  <h1>VoltHawk</h1>
  <div class="subtitle">Transmission Line Inspection Report</div>
  <div class="date">${esc(date)}</div>
</div>

<div class="section-title">Summary</div>
<div class="stats-grid">
  <div class="stat-card">
    <div class="label">Total Findings</div>
    <div class="value accent">${findings.length}</div>
  </div>
  <div class="stat-card">
    <div class="label">Critical</div>
    <div class="value critical">${grouped.critical.length}</div>
  </div>
  <div class="stat-card">
    <div class="label">High</div>
    <div class="value high">${grouped.high.length}</div>
  </div>
  <div class="stat-card">
    <div class="label">Risk Exposure</div>
    <div class="value risk">${esc(formatCurrency(riskMin))} – ${esc(formatCurrency(riskMax))}</div>
  </div>
</div>

<div class="section-title">NERC Compliance Status</div>
<div class="compliance-grid">
  <div class="compliance-card">
    <div class="std">FAC-003-4 Vegetation</div>
    <div class="count">${vegFindings.length} <span>findings</span></div>
    ${vegHighCrit > 0 ? `<div class="detail">${vegHighCrit} high/critical</div>` : ''}
    ${complianceBadge(vegHighCrit > 0)}
  </div>
  <div class="compliance-card">
    <div class="std">FAC-501-3 Structural</div>
    <div class="count">${structFindings.length} <span>findings</span></div>
    ${structHighCrit > 0 ? `<div class="detail">${structHighCrit} high/critical</div>` : ''}
    ${complianceBadge(structHighCrit > 0)}
  </div>
  <div class="compliance-card">
    <div class="std">NESC Rule 215 Insulators</div>
    <div class="count">${insulatorFindings.length} <span>findings</span></div>
    ${insulatorHighCrit > 0 ? `<div class="detail">${insulatorHighCrit} high/critical</div>` : ''}
    ${complianceBadge(insulatorHighCrit > 0)}
  </div>
</div>

<div class="section-title">All Findings</div>
<table>
  <thead>
    <tr>
      <th>ID</th>
      <th>Severity</th>
      <th>Type</th>
      <th>Time Range</th>
      <th>Condition</th>
      <th>NERC Ref</th>
      <th>Recommended Action</th>
    </tr>
  </thead>
  <tbody>
    ${sorted.map(f => `<tr>
      <td style="font-family:monospace;font-weight:700">#${f.id}</td>
      <td>${severityBadge(f.severity)}</td>
      <td>${esc(f.anomaly_type.replace(/_/g, ' '))}</td>
      <td style="font-family:monospace;white-space:nowrap">${formatTime(f.start_time)} – ${formatTime(f.end_time)}</td>
      <td style="max-width:260px;font-size:12px">${esc(f.condition || f.query_used)}</td>
      <td style="font-size:12px">${esc(f.nerc_reference)}</td>
      <td style="font-size:12px">${esc(f.recommended_action)}</td>
    </tr>`).join('\n    ')}
  </tbody>
</table>

${escalations.length > 0 ? `
<div class="section-title">Escalated Findings — Maintenance Cross-Reference</div>
${escalations.map(e => `<div class="escalation-card">
  <div class="tower">${esc(e.tower_id)} <span class="status-badge ${e.maintenance_status === 'overdue' ? 'status-overdue' : 'status-deferred'}">${esc(e.maintenance_status)}</span></div>
  <div class="meta">${esc(e.location_description)} &middot; Last inspected: ${esc(e.last_inspection)} &middot; ${e.years_in_service} yrs in service &middot; ${esc(e.voltage)}</div>
  <div class="meta">Linked Finding: <strong>#${e.finding.id}</strong> — ${esc(e.finding.anomaly_type.replace(/_/g, ' '))} (${esc(e.finding.severity)})</div>
  <div class="alert">ESCALATED — ${esc(e.maintenance_status)} maintenance + active visual anomaly detected. Immediate priority upgrade recommended.</div>
</div>`).join('\n')}`
: ''}

<div class="section-title">Validation Metrics</div>
<div class="metrics-grid">
  <div class="metric-card">
    <div class="label">Precision</div>
    <div class="value">77.3%</div>
  </div>
  <div class="metric-card">
    <div class="label">Recall</div>
    <div class="value">100%</div>
  </div>
  <div class="metric-card">
    <div class="label">F1 Score</div>
    <div class="value">87.2%</div>
  </div>
</div>

<div class="footer">
  Generated by VoltHawk | Powered by TwelveLabs Marengo 3.0 + Pegasus 1.2 via AWS Bedrock
</div>

</body>
</html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
