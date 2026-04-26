'use client'

import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const STEPS = [
  { key: 'uploading', label: 'Uploading video to S3', detail: 'Transferring drone footage to secure storage' },
  { key: 'embedding', label: 'Creating video embeddings', detail: 'Marengo 3.0 analyzing visual frames' },
  { key: 'analyzing', label: 'Analyzing findings with Pegasus', detail: 'Generating structured condition reports' },
]

function getStepIndex(status) {
  return STEPS.findIndex(s => s.key === status)
}

export default function ProcessingScreen({ status, error, segmentCount }) {
  const currentIndex = getStepIndex(status)

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-8">
      <div className="flex items-center gap-3 mb-10">
        <img src="/logo.png" alt="VoltHawk" width="56" height="56" className="shrink-0" style={{height: '56px', width: '56px', minWidth: '56px', objectFit: 'contain'}} />
        <h1 className="text-3xl font-bold tracking-tight">VoltHawk</h1>
      </div>

      {error ? (
        <div className="w-full max-w-md bg-critical/10 border border-critical/30 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-critical shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-critical">Processing Failed</p>
            <p className="text-sm text-text-secondary mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          {STEPS.map((step, i) => {
            const isActive = i === currentIndex
            const isDone = i < currentIndex

            return (
              <div
                key={step.key}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-accent/10 border-accent/30'
                    : isDone
                    ? 'bg-surface-1 border-border opacity-70'
                    : 'bg-surface-1 border-border opacity-40'
                }`}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle className="w-6 h-6 text-low" />
                  ) : isActive ? (
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-border" />
                  )}
                </div>
                <div>
                  <p className={`font-medium text-sm ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{step.detail}</p>
                  {isActive && step.key === 'embedding' && segmentCount > 0 && (
                    <p className="text-xs text-accent mt-1 font-mono">{segmentCount} segments embedded</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-text-secondary mt-8">
        Powered by TwelveLabs Marengo 3.0 + Pegasus 1.2 via AWS Bedrock
      </p>
    </div>
  )
}
