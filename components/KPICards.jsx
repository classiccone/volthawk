'use client'

import { AlertTriangle, AlertCircle, Activity, DollarSign } from 'lucide-react'
import { formatCurrency } from '../lib/riskCalculation'

export default function KPICards({ findings, riskRange }) {
  const critical = findings.filter(f => f.severity === 'critical').length
  const high = findings.filter(f => f.severity === 'high').length

  const cards = [
    { label: 'Total Findings', value: findings.length, icon: Activity, accent: 'text-accent', leftBorder: 'border-l-accent' },
    { label: 'Critical', value: critical, icon: AlertTriangle, accent: 'text-critical', leftBorder: 'border-l-critical' },
    { label: 'High', value: high, icon: AlertCircle, accent: 'text-high', leftBorder: 'border-l-high' },
    { label: 'Risk Exposure', value: `${formatCurrency(riskRange[0])} – ${formatCurrency(riskRange[1])}`, icon: DollarSign, accent: 'text-moderate', leftBorder: 'border-l-moderate', smallValue: true },
  ]

  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-4">
      {cards.map(card => (
        <div key={card.label} className={`bg-surface-1 border border-border ${card.leftBorder} border-l-3 rounded-xl p-5 flex items-center gap-4`}>
          <div className={`p-3 rounded-lg bg-surface-2 ${card.accent}`}>
            <card.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">{card.label}</p>
            <p className={`${card.smallValue ? 'text-xl' : 'text-3xl'} font-bold font-mono mt-1 ${card.accent}`}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
