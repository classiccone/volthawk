'use client'

import { useState, useRef } from 'react'
import { Upload, Video, FileVideo, History, FileJson } from 'lucide-react'

export default function UploadScreen({ onUpload, onLoadPrevious, onLoadJSON }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const inputRef = useRef(null)
  const jsonRef = useRef(null)

  function handleDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) setSelectedFile(file)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) setSelectedFile(file)
  }

  function handleJSONChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        const findings = Array.isArray(data) ? data : data.findings
        if (findings?.length > 0) onLoadJSON(findings, file.name)
      } catch {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  function formatSize(bytes) {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
    return `${(bytes / 1e3).toFixed(0)} KB`
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-8">
      <div className="flex items-center gap-3 mb-2">
        <img src="/logo.png" alt="VoltHawk" className="h-14" />
        <h1 className="text-3xl font-bold tracking-tight">VoltHawk</h1>
      </div>
      <p className="text-text-secondary mb-10">AI-Powered Transmission Line Inspection</p>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
          dragActive
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-text-secondary bg-surface-1'
        }`}
      >
        <div className="p-4 rounded-2xl bg-surface-2">
          <Upload className="w-8 h-8 text-text-secondary" />
        </div>
        <div className="text-center">
          <p className="text-text-primary font-medium">
            Drop inspection video here or <span className="text-accent">browse</span>
          </p>
          <p className="text-text-secondary text-sm mt-1">
            MP4, MOV, AVI up to 500MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {selectedFile && (
        <div className="w-full max-w-xl mt-6 bg-surface-1 border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-surface-2">
            <FileVideo className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-text-secondary">{formatSize(selectedFile.size)}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onUpload(selectedFile) }}
            className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Analyze Video
          </button>
        </div>
      )}

      <div className="w-full max-w-xl mt-8 flex flex-col items-center gap-3">
        <p className="text-sm text-text-secondary">Or load previous analysis results</p>
        <div className="flex items-center gap-3">
          {onLoadPrevious && (
            <button
              onClick={onLoadPrevious}
              className="px-5 py-2.5 bg-surface-1 border border-border text-text-secondary font-medium rounded-lg hover:bg-surface-2 transition-colors flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Load Last Session
            </button>
          )}
          <button
            onClick={() => jsonRef.current?.click()}
            className="px-5 py-2.5 bg-surface-1 border border-border text-text-secondary font-medium rounded-lg hover:bg-surface-2 transition-colors flex items-center gap-2"
          >
            <FileJson className="w-4 h-4" />
            Load from JSON File
          </button>
          <input
            ref={jsonRef}
            type="file"
            accept=".json"
            onChange={handleJSONChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="mt-12 grid grid-cols-3 gap-8 text-center max-w-xl">
        {[
          { step: '1', label: 'Upload', desc: 'Drone footage' },
          { step: '2', label: 'Embed', desc: 'Marengo 3.0 analysis' },
          { step: '3', label: 'Report', desc: 'AI-powered findings' },
        ].map(s => (
          <div key={s.step} className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-sm font-mono font-bold text-text-secondary">
              {s.step}
            </div>
            <p className="text-sm font-medium">{s.label}</p>
            <p className="text-xs text-text-secondary">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
