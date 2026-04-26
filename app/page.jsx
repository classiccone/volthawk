'use client'

import { useState, useEffect, useRef } from 'react'
import UploadScreen from '../components/UploadScreen'
import ProcessingScreen from '../components/ProcessingScreen'
import Header from '../components/Header'
import KPICards from '../components/KPICards'
import SeverityChart from '../components/SeverityChart'
import DetectionTimeline from '../components/DetectionTimeline'
import FindingsTable from '../components/FindingsTable'
import MaintenanceCrossRef from '../components/MaintenanceCrossRef'
import ChatPanel from '../components/ChatPanel'
import Footer from '../components/Footer'
import { getTotalRiskExposure } from '../lib/riskCalculation'
import { exportCSV } from '../lib/exportCSV'
import { generateReport } from '../lib/generateReport'
import maintenanceData from '../data/maintenance.json'

export default function Home() {
  const [screen, setScreen] = useState('loading')
  const [status, setStatus] = useState('idle')
  const [findings, setFindings] = useState([])
  const [error, setError] = useState(null)
  const [segmentCount, setSegmentCount] = useState(0)
  const [videoName, setVideoName] = useState(null)
  const [analysisDate, setAnalysisDate] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)

  useEffect(() => {
    fetch('/api/findings')
      .then(res => res.json())
      .then(data => {
        if (data.findings?.length > 0) {
          setFindings(data.findings)
          if (data.videoName) setVideoName(data.videoName)
          if (data.analysisDate) setAnalysisDate(data.analysisDate)
          setScreen('results')
        } else {
          setScreen('upload')
        }
      })
      .catch(() => setScreen('upload'))
  }, [])

  async function saveFindings(results, name) {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    setAnalysisDate(date)
    if (name) setVideoName(name)
    try {
      await fetch('/api/findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findings: results, videoName: name, analysisDate: date }),
      })
    } catch (err) {
      console.error('Failed to save findings:', err.message)
    }
  }

  async function loadPrevious() {
    const res = await fetch('/api/findings')
    const data = await res.json()
    if (data.findings?.length > 0) {
      setFindings(data.findings)
      if (data.videoName) setVideoName(data.videoName)
      if (data.analysisDate) setAnalysisDate(data.analysisDate)
      setScreen('results')
    }
  }

  async function handleLoadJSON(findings, fileName) {
    setFindings(findings)
    await saveFindings(findings, fileName)
    setScreen('results')
  }

  async function handleUpload(file) {
    setScreen('processing')
    setStatus('uploading')
    setError(null)
    setVideoUrl(URL.createObjectURL(file))

    try {
      // 1. Upload video
      const formData = new FormData()
      formData.append('video', file)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      const { jobId, videoKey } = await uploadRes.json()

      // 2. Poll for embedding completion
      setStatus('embedding')

      while (true) {
        await new Promise(r => setTimeout(r, 3000))

        const statusRes = await fetch(`/api/status?jobId=${encodeURIComponent(jobId)}`)
        if (!statusRes.ok) {
          const err = await statusRes.json().catch(() => ({}))
          throw new Error(err.error || 'Status check failed')
        }

        const statusData = await statusRes.json()

        if (statusData.status === 'Completed') {
          setSegmentCount(statusData.segmentCount || 0)
          break
        } else if (statusData.status === 'Failed') {
          throw new Error(statusData.failureMessage || 'Embedding generation failed')
        }
        // InProgress — keep polling
      }

      // 3. Analyze findings
      setStatus('analyzing')

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, videoKey }),
      })

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({}))
        throw new Error(err.error || 'Analysis failed')
      }

      const { findings: results } = await analyzeRes.json()
      setFindings(results)
      await saveFindings(results, file.name)
      setScreen('results')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function handleNewInspection() {
    setFindings([])
    setScreen('upload')
    setVideoName(null)
    setAnalysisDate(null)
    setVideoUrl(null)
    setError(null)
    setStatus('idle')
    setSegmentCount(0)
  }

  function handleUpdateFinding(id, updates) {
    setFindings(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  if (screen === 'loading') {
    return null
  }

  if (screen === 'upload') {
    return <UploadScreen onUpload={handleUpload} onLoadPrevious={loadPrevious} onLoadJSON={handleLoadJSON} />
  }

  if (screen === 'processing') {
    return <ProcessingScreen status={status} error={error} segmentCount={segmentCount} />
  }

  // Results dashboard
  const riskRange = getTotalRiskExposure(findings)
  const escalations = maintenanceData.filter(
    m => (m.maintenance_status === 'deferred' || m.maintenance_status === 'overdue') && m.linked_finding_id
  )

  // NERC compliance counts
  const vegFindings = findings.filter(f => f.anomaly_type?.toLowerCase().includes('vegetation'))
  const vegHighCrit = vegFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length
  const structFindings = findings.filter(f => f.anomaly_type?.toLowerCase().includes('corrosion') || f.anomaly_type?.toLowerCase().includes('structural'))
  const structHighCrit = structFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length
  const insulatorFindings = findings.filter(f => f.anomaly_type?.toLowerCase().includes('insulator'))
  const insulatorHighCrit = insulatorFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length

  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      <Header
        onExportCSV={() => exportCSV(findings)}
        onGenerateReport={() => generateReport(findings, maintenanceData)}
        onNewInspection={handleNewInspection}
        videoName={videoName}
        analysisDate={analysisDate}
      />
      {!videoUrl && (
        <div className="mx-6 mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
          <span className="text-sm text-amber-600 font-medium">Video not attached — attach for evidence playback</span>
          <label className="px-4 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg cursor-pointer hover:bg-amber-600 transition-colors">
            Attach Video
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) setVideoUrl(URL.createObjectURL(file))
              }}
            />
          </label>
        </div>
      )}
      <KPICards findings={findings} riskRange={riskRange} />

      {/* NERC Compliance Status */}
      <div className="px-6 pb-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">NERC Compliance Status</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-1 border border-border rounded-xl p-5">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">FAC-003-4 Vegetation</p>
            <p className="text-2xl font-bold font-mono mt-1 text-text-primary">{vegFindings.length} <span className="text-sm font-normal text-text-secondary">findings</span></p>
            {vegHighCrit > 0 && <p className="text-xs text-text-secondary mt-1">{vegHighCrit} high/critical</p>}
            <span className={`inline-block mt-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-md border ${vegHighCrit > 0 ? 'bg-critical/10 text-critical border-critical/30' : 'bg-green-500/10 text-green-600 border-green-500/30'}`}>
              {vegHighCrit > 0 ? 'Violations Found' : 'Compliant'}
            </span>
          </div>
          <div className="bg-surface-1 border border-border rounded-xl p-5">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">FAC-501-3 Structural</p>
            <p className="text-2xl font-bold font-mono mt-1 text-text-primary">{structFindings.length} <span className="text-sm font-normal text-text-secondary">findings</span></p>
            {structHighCrit > 0 && <p className="text-xs text-text-secondary mt-1">{structHighCrit} high/critical</p>}
            <span className={`inline-block mt-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-md border ${structHighCrit > 0 ? 'bg-critical/10 text-critical border-critical/30' : 'bg-green-500/10 text-green-600 border-green-500/30'}`}>
              {structHighCrit > 0 ? 'Violations Found' : 'Compliant'}
            </span>
          </div>
          <div className="bg-surface-1 border border-border rounded-xl p-5">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">NESC Rule 215 Insulators</p>
            <p className="text-2xl font-bold font-mono mt-1 text-text-primary">{insulatorFindings.length} <span className="text-sm font-normal text-text-secondary">findings</span></p>
            {insulatorHighCrit > 0 && <p className="text-xs text-text-secondary mt-1">{insulatorHighCrit} high/critical</p>}
            <span className={`inline-block mt-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-md border ${insulatorHighCrit > 0 ? 'bg-critical/10 text-critical border-critical/30' : 'bg-green-500/10 text-green-600 border-green-500/30'}`}>
              {insulatorHighCrit > 0 ? 'Violations Found' : 'Compliant'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 flex gap-5">
        <div className="w-[65%] space-y-5">
          <SeverityChart findings={findings} />
          <DetectionTimeline findings={findings} />
          <FindingsTable findings={findings} escalations={escalations} videoUrl={videoUrl} onUpdateFinding={handleUpdateFinding} />
          <MaintenanceCrossRef findings={findings} maintenance={maintenanceData} />
        </div>
        <div className="w-[35%]">
          <div className="sticky top-4">
            <ChatPanel findings={findings} maintenance={maintenanceData} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
