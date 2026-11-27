import { readJson, sendJson } from '../lib/server/auth.js'
import { readFromSheets, writeToSheets } from '../lib/server/sheets.js'

// Equipos y escudos cargados desde el panel (hoja "Escudos" de la planilla).
// Público para lectura: la invitación necesita los escudos.

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const teams = await readFromSheets('getTeams')
      return sendJson(res, 200, Array.isArray(teams) ? teams : [])
    }

    if (req.method === 'POST') {
      const body = await readJson(req)
      const { action } = body

      if (action === 'add') {
        const nombre = String(body.nombre || '').trim()
        const escudo = String(body.escudo || '').trim()
        if (!nombre) return sendJson(res, 400, { error: 'Falta el nombre del equipo' })
        if (!escudo) return sendJson(res, 400, { error: 'Falta el escudo (SVG o link)' })
        // Límite de tamaño para no romper la planilla (50 KB de SVG alcanza y sobra)
        if (escudo.length > 60000) return sendJson(res, 400, { error: 'El SVG es demasiado grande (máx. 60.000 caracteres)' })
        const data = await writeToSheets('addTeam', {
          nombre,
          id: String(body.id || '').trim(),
          sigla: String(body.sigla || '').trim().slice(0, 4),
          escudo,
          colorPrimario: String(body.colorPrimario || '').slice(0, 20),
          colorSecundario: String(body.colorSecundario || '').slice(0, 20),
        })
        return sendJson(res, 201, { ok: true, team: data })
      }

      if (action === 'remove') {
        const id = String(body.id || '').trim()
        if (!id) return sendJson(res, 400, { error: 'Falta el id' })
        await writeToSheets('removeTeam', { id })
        return sendJson(res, 200, { ok: true })
      }

      return sendJson(res, 400, { error: 'Acción desconocida' })
    }

    return sendJson(res, 405, { error: 'Método no permitido' })
  } catch (error) {
    console.error('teams:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
