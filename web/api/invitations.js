import { readJson, sendJson } from '../lib/server/auth.js'
import { readFromSheets, writeToSheets } from '../lib/server/sheets.js'

// Endpoints públicos: solo lectura por slug y contador de vistas.
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const slug = new URL(req.url, 'http://localhost').searchParams.get('slug')
      if (!slug) return sendJson(res, 400, { error: 'Falta el slug' })
      const event = await readFromSheets('getBySlug', { slug })
      return sendJson(res, 200, event)
    }

    if (req.method === 'POST') {
      const body = await readJson(req)
      if (body.action === 'incrementViews' && body.slug) {
        const data = await writeToSheets('incrementViews', { slug: body.slug })
        return sendJson(res, 200, { views: data.views })
      }

      // Paso final del creador: guarda la fila en la planilla y le avisa al operador.
      // No requiere clave: los datos son los mismos que ya viajan al formulario.
      if (body.action === 'create') {
        const inv = body.invitation || {}
        const slug = String(inv.slug || '')
        if (!/^[a-z0-9-]{3,120}$/i.test(slug)) return sendJson(res, 400, { error: 'Slug inválido' })
        if (!inv.childName) return sendJson(res, 400, { error: 'Falta el nombre' })
        try {
          const data = await writeToSheets('createInvitation', {
            slug,
            nombre: String(inv.childName).slice(0, 60),
            apellido: String(inv.honoreeName || '').slice(0, 60),
            apodo: String(inv.nickname || '').slice(0, 40),
            edad: String(inv.honoreeAge || '').slice(0, 3),
            equipo: String(inv.customTeamName || inv.team || '').slice(0, 80),
            contacto: String(inv.childName || '').slice(0, 60),
            fecha: String(inv.date || '').slice(0, 20),
            hora: String(inv.time || '').slice(0, 30),
            lugar: String(inv.location || inv.address || '').slice(0, 200),
            telefono: String(inv.contactWhatsApp || '').slice(0, 25),
            email: String(inv.email || '').slice(0, 120),
            mensaje: String(inv.message || '').slice(0, 200),
            vestimenta: String(inv.dressCode || '').slice(0, 80),
            estado: 'PENDIENTE',
            pago: body.paymentId ? String(body.paymentId).slice(0, 30) : '',
          })
          return sendJson(res, 201, { ok: true, saved: true, data })
        } catch (error) {
          // Si la planilla no está conectada, no rompemos el flujo del cliente:
          // el pedido igual queda como intención por WhatsApp.
          console.error('createInvitation:', error.message)
          return sendJson(res, 200, { ok: true, saved: false, warning: error.message })
        }
      }

      return sendJson(res, 400, { error: 'Acción no permitida' })
    }

    return sendJson(res, 405, { error: 'Método no permitido' })
  } catch (error) {
    console.error('invitations:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
