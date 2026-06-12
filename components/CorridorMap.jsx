'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CORRIDOR, findingToCoords } from '../lib/geo'

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  moderate: '#ca8a04',
  low: '#16a34a',
}

const SEVERITY_BG = {
  critical: 'bg-red-600/15 text-red-600 border-red-600/30',
  high: 'bg-orange-600/15 text-orange-600 border-orange-600/30',
  moderate: 'bg-yellow-600/15 text-yellow-600 border-yellow-600/30',
  low: 'bg-green-600/15 text-green-600 border-green-600/30',
}

function FitBounds() {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds(CORRIDOR.map(c => [c[0], c[1]]))
    map.fitBounds(bounds.pad(0.15))
  }, [map])
  return null
}

function TowerMarker({ position, tower }) {
  const isAlert = tower.maintenance_status === 'deferred' || tower.maintenance_status === 'overdue'
  return (
    <>
      {isAlert && (
        <CircleMarker center={position} radius={10} pathOptions={{ color: '#dc2626', weight: 2, fill: false }} />
      )}
      <CircleMarker
        center={position}
        radius={5}
        pathOptions={{ color: '#475569', weight: 2, fillColor: '#94a3b8', fillOpacity: 1 }}
      >
        <Popup>
          <div className="text-xs space-y-1 min-w-[160px]">
            <p className="font-bold text-sm">{tower.tower_id}</p>
            <p className="text-gray-600">{tower.location_description}</p>
            <p>Status: <span className={`font-semibold ${isAlert ? 'text-red-600' : 'text-green-600'}`}>{tower.maintenance_status}</span></p>
            <p>Last inspection: {tower.last_inspection}</p>
            <p>Years in service: {tower.years_in_service}</p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  )
}

export default function CorridorMap({ findings, maintenance }) {
  // Space towers evenly along the corridor
  const towerPositions = maintenance.map((_, i) => {
    const t = (i + 1) / (maintenance.length + 1)
    const fakeFinding = { start_time: t * 1210 }
    return findingToCoords(fakeFinding)
  })

  return (
    <MapContainer
      center={[36.813, -89.543]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', borderRadius: '0.375rem' }}
      attributionControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds />
      <Polyline
        positions={CORRIDOR}
        pathOptions={{ color: '#6366f1', weight: 3, dashArray: '8 6', opacity: 0.7 }}
      />
      {findings.map(f => {
        const pos = findingToCoords(f)
        const color = SEVERITY_COLORS[f.severity] || '#6b7280'
        return (
          <CircleMarker
            key={f.id}
            center={pos}
            radius={6}
            pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.7 }}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[180px]">
                <p className="font-bold text-sm">Finding #{f.id}</p>
                <p className="capitalize">{f.anomaly_type?.replace(/_/g, ' ')}</p>
                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${SEVERITY_BG[f.severity] || ''}`}>
                  {f.severity}
                </span>
                <p className="text-gray-500">{Math.floor(f.start_time / 60)}:{String(Math.floor(f.start_time % 60)).padStart(2, '0')} – {Math.floor(f.end_time / 60)}:{String(Math.floor(f.end_time % 60)).padStart(2, '0')}</p>
                <p className="text-gray-600 line-clamp-2">{f.condition?.slice(0, 120)}{f.condition?.length > 120 ? '...' : ''}</p>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
      {maintenance.map((tower, i) => (
        <TowerMarker key={tower.tower_id} position={towerPositions[i]} tower={tower} />
      ))}
    </MapContainer>
  )
}
