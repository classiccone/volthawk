'use client'

import { formatCurrency } from '../lib/riskCalculation'

export default function KPICards({ findings, riskRange }) {
  const critical = findings.filter(f => f.severity === 'critical').length
  const high = findings.filter(f => f.severity === 'high').length

  return (
    <div className="mx-6 my-3">
      <div className="bg-surface-1 border border-border rounded-md px-5 py-2.5 flex items-center divide-x divide-border">
        <div className="pr-6">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Total Findings</p>
          <p className="text-lg font-semibold font-mono text-text-primary">{findings.length}</p>
        </div>
        <div className="px-6">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Critical</p>
          <p className={`text-lg font-semibold font-mono ${critical > 0 ? 'text-critical' : 'text-text-primary'}`}>{critical}</p>
        </div>
        <div className="px-6">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">High</p>
          <p className={`text-lg font-semibold font-mono ${high > 0 ? 'text-high' : 'text-text-primary'}`}>{high}</p>
        </div>
        <div className="pl-6">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Risk Exposure</p>
          <p className="text-lg font-semibold font-mono text-text-primary">{formatCurrency(riskRange[0])} – {formatCurrency(riskRange[1])}</p>
        </div>
      </div>
    </div>
  )
}
