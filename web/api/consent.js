import { readJson, sendJson } from '../lib/server/auth.js'
import { writeToSheets } from '../lib/server/sheets.js'

// Consentimiento de marketing (Fase 4). Arranca SIEMPRE apagado.
// La baja es idempotente: pedirla dos veces deja el mismo resultado.

const SLUG = /^[a-z0-9-]{3,120}$/i

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' })
  try {
    const body = await readJson(req)
    const tipo = body.tipo === 'rsvp' ? 'rsvp' : 'order'
    const granted = body.consent_marketing === true || body.consent_marketing === 'true'

    if (tipo === 'order') {
      const slug = String(body.slug || '')
      if (!SLUG.test(slug)) return sendJson(res, 400, { error: 'Código inválido' })
      await writeToSheets('setConsent', {
        tipo: 'order',
        slug,
        consent_marketing: granted ? 'true' : 'false',
        consent_source: String(body.source || 'checkout').slice(0, 40),
      })
      return sendJson(res, 200, { ok: true, tipo, consent_marketing: granted })
    }

    const slug = String(body.slug || '')
    const nombre = String(body.nombre || '').trim()
    if (!SLUG.test(slug) || !nombre) return sendJson(res, 400, { error: 'Faltan datos' })
    await writeToSheets('setConsent', {
      tipo: 'rsvp',
      slug,
      nombre: nombre.slice(0, 80),
      consent_marketing: granted ? 'true' : 'false',
      consent_source: String(body.source || 'rsvp').slice(0, 40),
    })
    return sendJson(res, 200, { ok: true, tipo, consent_marketing: granted })
  } catch (error) {
    console.error('consent:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
