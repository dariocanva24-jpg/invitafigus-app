import { readJson, sendJson } from '../lib/server/auth.js'

// El cobro se hace con el link de pago de Mercado Pago y la verificación
// del operador. Acá dejamos el registro de intención para que el panel
// sepa qué pedidos están pendientes.

const SLUG = /^[a-z0-9-]{3,120}$/i

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' })

  let body = {}
  try { body = await readJson(req) } catch { body = {} }
  const { action } = body
  const code = String(body.code || '')

  if (action === 'start' || action === 'create') {
    if (!SLUG.test(code)) return sendJson(res, 400, { error: 'Código inválido' })
    // El pedido ya queda guardado como PENDIENTE en la planilla desde /crear.
    return sendJson(res, 200, { status: 'pending', code, redirect: 'https://mpago.la/1X2RD5k' })
  }

  if (action === 'status') {
    // Sin verificación automática: el operador activa el pedido desde el panel.
    return sendJson(res, 200, { status: 'pending' })
  }

  if (action === 'verify') {
    return sendJson(res, 200, { status: 'manual', message: 'La acreditación la confirma el operador.' })
  }

  return sendJson(res, 400, { error: 'Acción desconocida' })
}
