// Equipos cargados desde el panel de administración.
// Se guardan en la hoja "Escudos" de la planilla y se mezclan con los 29 de fábrica.
import { useEffect, useState } from 'react'
import { teams as baseTeams, getTeamById } from '../data/teams'

let cache = null
let inflight = null

function normalizeId(value = '') {
  return String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Convierte el SVG crudo en un data URI que el navegador puede mostrar.
export function escudoToSrc(escudo) {
  const value = String(escudo || '').trim()
  if (!value) return ''
  // Ya es un link (Drive, http, /escudos/...) o un data URI
  if (value.startsWith('http') || value.startsWith('/') || value.startsWith('data:')) return value
  // Es código SVG pegado: lo convertimos
  const limpio = value.startsWith('<svg')
    ? value
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${value}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(limpio)}`
}

function mapTeam(row) {
  const id = normalizeId(row.id || row.nombre)
  return {
    id,
    name: row.nombre || row.nombre,
    shortName: (row.sigla || row.nombre || '').toUpperCase().slice(0, 4),
    shield: escudoToSrc(row.escudo),
    colors: {
      primary: row.colorPrimario || '#0a0e27',
      secondary: row.colorSecundario || '#FFD700',
      text: '#ffffff',
    },
    category: 'personalizado',
    custom: true,
  }
}

export async function loadDynamicTeams() {
  if (cache) return cache
  if (inflight) return inflight
  inflight = fetch('/api/teams')
    .then((res) => (res.ok ? res.json() : []))
    .then((data) => {
      const list = Array.isArray(data) ? data : []
      cache = list.filter((row) => row && row.nombre && row.escudo).map(mapTeam)
      return cache
    })
    .catch(() => {
      cache = []
      return cache
    })
    .finally(() => { inflight = null })
  return inflight
}

export function invalidateDynamicTeams() {
  cache = null
}

// Hook: devuelve todos los equipos (fábrica + los del panel).
export function useAllTeams() {
  const [extra, setExtra] = useState(cache || [])

  useEffect(() => {
    let active = true
    loadDynamicTeams().then((list) => { if (active) setExtra(list) })
    return () => { active = false }
  }, [])

  return [...baseTeams, ...extra]
}

// Busca un equipo en la lista ampliada (sirve también para los de la planilla).
export function findTeamById(id, extras = cache || []) {
  return getTeamById(id) || extras.find((team) => team.id === id) || null
}
