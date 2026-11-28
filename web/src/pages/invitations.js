import { readJson, sendJson } from '../server/auth.js'
import { toE164 } from '../server/mercadopago.js'
import { amountForPlan } from '../server/pricing.js'
import { readFromSheets, writeToSheets } from '../server/sheets.js'

// Endpoints públicos: solo lectura por slug y contador de vistas.
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const params = new URL(req.url, 'http://localhost').searchParams
      const slug = params.get('slug')
      if (!slug) return sendJson(res, 400, { error: 'Falta el slug' })
      // modo=compartir → si el pedido todavía no está pago, devuelve la vista
      // con marca de agua para poder pasarla por WhatsApp igual.
      const modo = params.get('modo') === 'compartir' ? 'compartir' : ''
      const event = await readFromSheets('getBySlug', modo ? { slug, modo } : { slug })
      sendJson(res, 200, event)
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
        const plan = body.plan === 'completo' ? 'completo' : 'base'
        const utm = body.utm || {}
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
            telefono: toE164(inv.contactWhatsApp).slice(0, 25),
            email: String(inv.email || '').slice(0, 120),
            mensaje: String(inv.message || '').slice(0, 200),
            vestimenta: String(inv.dressCode || '').slice(0, 80),
            estado: 'BORRADOR',
            pago: body.paymentId ? String(body.paymentId).slice(0, 30) : '',
            plan,
            monto: amountForPlan(plan),
            consent_marketing: body.consent_marketing ? 'true' : 'false',
            consent_source: body.consent_marketing ? 'checkout' : '',
            utm_source: String(utm.source || '').slice(0, 60),
            utm_medium: String(utm.medium || '').slice(0, 60),
            utm_campaign: String(utm.campaign || '').slice(0, 80),
            utm_content: String(utm.content || '').slice(0, 80),
            // El retrato del cumpleañero viaja como texto: la planilla lo guarda
            // en su columna foto_url y lo usa de portada en la invitación.
            // Tope 45.000 caracteres: una celda de Sheets admite 50.000. Si la foto
            // es más grande, no se manda (la invitación usa la copia del navegador).
            foto_url: (() => {
              const foto = String(inv.honoreePhoto || inv.foto_url || '')
              return foto.length <= 45000 ? foto : ''
            })(),
            maps_url: String(inv.mapsUrl || '').slice(0, 300),
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
