'use client'

import { Download, FileText, FileVideo, Calendar, ArrowLeft } from 'lucide-react'

export default function Header({ onExportCSV, onGenerateReport, onNewInspection, videoName, analysisDate }) {
  return (
    <header className="border-b border-border bg-surface-1 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onNewInspection}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          New Inspection
        </button>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="VoltHawk" style={{height: '48px'}} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">VoltHawk</h1>
            <p className="text-xs text-text-secondary">AI-Powered Transmission Line Inspection</p>
            <p className="text-xs text-gray-400 italic">The grid's eye in the sky</p>
          </div>
        </div>
        {(videoName || analysisDate) && (
          <div className="ml-4 pl-4 border-l border-border flex items-center gap-4 text-xs text-text-secondary">
            {videoName && (
              <span className="flex items-center gap-1.5">
                <FileVideo className="w-3.5 h-3.5" />
                {videoName}
              </span>
            )}
            {analysisDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {analysisDate}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:text-text-primary transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button
          onClick={onGenerateReport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>
    </header>
  )
}
