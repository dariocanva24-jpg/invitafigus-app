import { readJson, sendJson } from '../server/auth.js'
import { readFromSheets, writeToSheets } from '../server/sheets.js'

// Panel del organizador respaldado por la planilla (columna "clave").
const SLUG = /^[a-z0-9-]{3,120}$/i

// La lista de invitados y la clave del panel son parte de lo que se compra.
const ESTADOS_PAGADOS = ['ACTIVA', 'REEMBOLSADA', 'CONTRACARGO']

async function pedidoPagado(code) {
  const order = await readFromSheets('getOrder', { slug: code })
  if (!order) return { ok: false, motivo: 'inexistente' }
  const estado = String(order.estado || '').toUpperCase()
  return { ok: ESTADOS_PAGADOS.includes(estado), motivo: estado || 'BORRADOR' }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' })
    const body = await readJson(req)
    const { action } = body
    const code = String(body.code || '')
    if (!SLUG.test(code)) return sendJson(res, 400, { error: 'Código inválido' })

    if (action === 'issue' || action === 'summary') {
      const pago = await pedidoPagado(code)
      if (!pago.ok) {
        return sendJson(res, 402, {
          error: 'El panel se abre cuando la invitación está activada. Si ya pagaste, esperá un minuto y volvé a intentar.',
          codigo: 'SIN_PAGAR',
          estado: pago.motivo,
        })
      }
    }

    if (action === 'issue') {
      const data = await readFromSheets('panelIssue', { slug: code })
      return sendJson(res, 200, { code: data?.code || code, key: data?.key || '' })
    }

    if (action === 'summary') {
      const key = String(body.key || '')
      if (!key) return sendJson(res, 400, { error: 'Falta la clave del panel' })
      const data = await readFromSheets('panelSummary', { slug: code, key })
      return sendJson(res, 200, data)
    }

    return sendJson(res, 400, { error: 'Acción desconocida' })
  } catch (error) {
    console.error('panel:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
