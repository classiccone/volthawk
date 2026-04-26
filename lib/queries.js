export const DETECTION_QUERIES = {
  insulator_damage: [
    'damaged insulator on transmission tower',
    'cracked or broken insulator disc on power line',
    'insulator with burn marks or flashover damage',
    'contaminated dirty insulator string on tower',
  ],
  vegetation_encroachment: [
    'trees growing very close to power lines',
    'vegetation encroaching on transmission line corridor',
    'branches near high voltage conductors',
    'overgrown trees in power line right of way',
  ],
  structural_corrosion: [
    'rust or corrosion on transmission tower steel',
    'corroded metal structure on power line tower',
    'paint deterioration on tower structure',
    'visible metal degradation on lattice tower',
  ],
}

export const ASSET_TYPES = {
  vegetation_encroachment: 'vegetation',
  insulator_damage: 'insulator',
  structural_corrosion: 'tower_structure',
}

export const NERC_REFERENCES = {
  vegetation_encroachment: {
    critical: 'NERC FAC-003-4 R1/R2 — Imminent threat',
    high: 'NERC FAC-003-4 R3 — Clearance violation',
    moderate: 'NERC FAC-003-4 R7 — Monitoring required',
    low: 'NERC FAC-003-4 — Within clearance limits',
  },
  insulator_damage: {
    critical: 'NESC Rule 215 — Immediate insulator failure risk',
    high: 'NESC Rule 215 — Insulator integrity',
    moderate: 'IEEE 957 — Insulator cleaning guidelines',
    low: 'NESC Rule 215 — Minor insulator wear',
  },
  structural_corrosion: {
    critical: 'NERC FAC-501-3 — Structural failure imminent',
    high: 'NERC FAC-501-3 — Significant structural degradation',
    moderate: 'NERC FAC-501-3 — Facility structural integrity',
    low: 'NERC FAC-501-3 — Minor surface corrosion',
  },
}

export const RECOMMENDED_ACTIONS = {
  vegetation_encroachment: {
    critical: 'Emergency vegetation crew dispatch within 24 hours. Document for NERC compliance reporting.',
    high: 'Schedule trim crew within 30 days. Flag for FAC-003 compliance documentation.',
    moderate: 'Include in next vegetation management cycle. Monitor growth rate.',
    low: 'Note for next scheduled vegetation survey. No immediate action required.',
  },
  insulator_damage: {
    critical: 'Immediate de-energization and replacement required. Dispatch emergency climbing crew.',
    high: 'Schedule climbing crew inspection within 30 days. Prepare replacement insulator string if crack confirmed.',
    moderate: 'Schedule insulator washing at next maintenance window. Monitor weather forecasts for precipitation events.',
    low: 'Document for tracking. Include in next scheduled inspection.',
  },
  structural_corrosion: {
    critical: 'Emergency structural assessment required. Consider load reduction on affected circuit.',
    high: 'Schedule structural engineering assessment within 30 days. Evaluate load-bearing capacity.',
    moderate: 'Include in next scheduled maintenance cycle. Assess structural load capacity. Repaint exposed surfaces.',
    low: 'Document for tracking. Schedule repainting at next maintenance window.',
  },
}

export function scoreSeverity(marengoScore) {
  if (marengoScore > 0.85) return { level: 'critical', label: 'CRITICAL', priorityHours: 24 }
  if (marengoScore > 0.7) return { level: 'high', label: 'HIGH', priorityHours: 720 }
  if (marengoScore > 0.5) return { level: 'moderate', label: 'MODERATE', priorityHours: 2160 }
  return { level: 'low', label: 'LOW', priorityHours: 4320 }
}
