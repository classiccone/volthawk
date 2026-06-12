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
import dynamic from 'next/dynamic'
import { getTotalRiskExposure } from '../lib/riskCalculation'

const CorridorMap = dynamic(() => import('../components/CorridorMap'), { ssr: false })
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

  const saveTimerRef = useRef(null)
  const findingsRef = useRef(findings)
  findingsRef.current = findings

  function handleUpdateFinding(id, updates) {
    setFindings(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
    // Debounced persist so notes survive reload
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const latest = findingsRef.current
      fetch('/api/findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findings: latest, videoName, analysisDate }),
      }).catch(() => {})
    }, 800)
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
        <div className="mx-6 mt-3 px-4 py-2.5 border border-amber-500/30 rounded-md flex items-center justify-between">
          <span className="text-xs text-amber-600 font-medium">Video not attached — attach for evidence playback</span>
          <label className="px-3 py-1 text-[11px] font-medium bg-amber-500 text-white rounded cursor-pointer hover:bg-amber-600 transition-colors">
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
      <div className="px-6 pb-3">
        <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">NERC Compliance Status</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-1 border border-border rounded-md px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">FAC-003-4 Vegetation</p>
              <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded border ${vegHighCrit > 0 ? 'text-critical border-critical' : 'text-low border-low'}`}>
                {vegHighCrit > 0 ? 'Violations' : 'Compliant'}
              </span>
            </div>
            <p className="text-lg font-bold font-mono mt-1 text-text-primary">{vegFindings.length} <span className="text-xs font-normal text-text-secondary">findings</span>{vegHighCrit > 0 && <span className="text-xs font-normal text-text-secondary"> · {vegHighCrit} high/crit</span>}</p>
          </div>
          <div className="bg-surface-1 border border-border rounded-md px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">FAC-501-3 Structural</p>
              <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded border ${structHighCrit > 0 ? 'text-critical border-critical' : 'text-low border-low'}`}>
                {structHighCrit > 0 ? 'Violations' : 'Compliant'}
              </span>
            </div>
            <p className="text-lg font-bold font-mono mt-1 text-text-primary">{structFindings.length} <span className="text-xs font-normal text-text-secondary">findings</span>{structHighCrit > 0 && <span className="text-xs font-normal text-text-secondary"> · {structHighCrit} high/crit</span>}</p>
          </div>
          <div className="bg-surface-1 border border-border rounded-md px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">NESC Rule 215 Insulators</p>
              <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded border ${insulatorHighCrit > 0 ? 'text-critical border-critical' : 'text-low border-low'}`}>
                {insulatorHighCrit > 0 ? 'Violations' : 'Compliant'}
              </span>
            </div>
            <p className="text-lg font-bold font-mono mt-1 text-text-primary">{insulatorFindings.length} <span className="text-xs font-normal text-text-secondary">findings</span>{insulatorHighCrit > 0 && <span className="text-xs font-normal text-text-secondary"> · {insulatorHighCrit} high/crit</span>}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-4 flex gap-4">
        <div className="w-[65%] space-y-4">
          <SeverityChart findings={findings} />
          <DetectionTimeline findings={findings} />
          <div className="bg-surface-1 border border-border rounded-md p-4">
            <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Corridor Map</h3>
            <div className="h-[320px] rounded-md overflow-hidden">
              <CorridorMap findings={findings} maintenance={maintenanceData} />
            </div>
          </div>
          <FindingsTable findings={findings} escalations={escalations} videoUrl={videoUrl} onUpdateFinding={handleUpdateFinding} />
          <MaintenanceCrossRef findings={findings} maintenance={maintenanceData} />
        </div>
        <div className="w-[35%]">
          <div className="sticky top-20">
            <ChatPanel findings={findings} maintenance={maintenanceData} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
