import { isAdminRequest, readJson, sendJson } from '../lib/server/auth.js'
import { readFromSheets } from '../lib/server/sheets.js'
import { reconcilePendingOrders } from '../lib/server/reconcile.js'

// Auditoría de pagos + ventas por origen (UTM). Solo con sesión de admin.
export default async function handler(req, res) {
  if (!isAdminRequest(req)) return sendJson(res, 401, { error: 'No autorizado' })

  // POST: reconciliar pagos aprobados que quedaron sin activar.
  if (req.method === 'POST') {
    const body = await readJson(req).catch(() => ({}))
    if (body.action !== 'reconcile') return sendJson(res, 400, { error: 'Acción desconocida' })
    try {
      const result = await reconcilePendingOrders({ limit: Math.min(Number(body.limit) || 25, 100) })
      return sendJson(res, result.ok ? 200 : 503, result)
    } catch (error) {
      console.error('reconcile:', error.message)
      return sendJson(res, 502, { error: error.message })
    }
  }

  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Método no permitido' })
  try {
    const data = await readFromSheets('getAudit')
    const orders = Array.isArray(data?.orders) ? data.orders : []
    const logs = Array.isArray(data?.logs) ? data.logs : []

    const bySource = {}
    orders.forEach((order) => {
      const key = order.utm_source || '(directo)'
      bySource[key] = bySource[key] || { source: key, ventas: 0, monto: 0, activas: 0 }
      bySource[key].ventas += 1
      bySource[key].monto += Number(order.monto) || 0
      if (order.estado === 'ACTIVA') bySource[key].activas += 1
    })

    return sendJson(res, 200, {
      orders,
      logs,
      sources: Object.values(bySource).sort((a, b) => b.ventas - a.ventas),
    })
  } catch (error) {
    console.error('admin-audit:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
