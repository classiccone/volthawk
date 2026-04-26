export function calculateRiskRange(finding) {
  const { anomaly_type, severity } = finding
  const isHighSev = severity === 'critical' || severity === 'high'

  if (isHighSev) {
    if (anomaly_type === 'vegetation_encroachment') return [2_000_000, 8_000_000]
    if (anomaly_type === 'insulator_damage') return [500_000, 2_000_000]
    if (anomaly_type === 'structural_corrosion') return [5_000_000, 15_000_000]
  }
  return [50_000, 500_000]
}

export function formatCurrency(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

export function getTotalRiskExposure(findings) {
  let min = 0, max = 0
  for (const f of findings) {
    const [lo, hi] = calculateRiskRange(f)
    min += lo
    max += hi
  }
  return [min, max]
}
