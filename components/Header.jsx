'use client'

import { Download, FileText, FileVideo, Calendar, ArrowLeft } from 'lucide-react'

export default function Header({ onExportCSV, onGenerateReport, onNewInspection, videoName, analysisDate }) {
  return (
    <header className="border-b border-border bg-surface-1 px-5 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onNewInspection}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-surface-2 border border-border rounded hover:bg-surface-3 hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          New
        </button>
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="VoltHawk" width="36" height="36" className="shrink-0" style={{height: '36px', width: '36px', minWidth: '36px', objectFit: 'contain'}} />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-text-primary leading-tight">VoltHawk</h1>
            <p className="text-[11px] text-text-secondary">AI-Powered Transmission Line Inspection</p>
          </div>
        </div>
        {(videoName || analysisDate) && (
          <div className="ml-3 pl-3 border-l border-border flex items-center gap-3 text-[11px] text-text-secondary">
            {videoName && (
              <span className="flex items-center gap-1">
                <FileVideo className="w-3 h-3" />
                {videoName}
              </span>
            )}
            {analysisDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {analysisDate}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-2 border border-border rounded hover:bg-surface-3 hover:text-text-primary transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
        <button
          onClick={onGenerateReport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent rounded hover:bg-accent/90 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Generate Report
        </button>
      </div>
    </header>
  )
}
