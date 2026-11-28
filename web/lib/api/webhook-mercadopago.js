import { readJson, sendJson } from '../server/auth.js'
import { readFromSheets, writeToSheets, writeToSheetsWithRetry } from '../server/sheets.js'
import { getPayment, getMerchantOrder, verifyWebhookSignature, mpConfig } from '../server/mercadopago.js'
import { isAllowedAmount, planForAmount } from '../server/pricing.js'

// POST /api/webhook-mercadopago
//
// Seguridad (en este orden, sin excepciones):
//  1. Firma x-signature (HMAC SHA-256). Si no valida → 401, se descarta.
//  2. Se REELEE el pago en la API de MP. El payload no se cree.
//  3. Se verifica status approved + monto exacto + pedido PENDIENTE existente.
//  4. Recién ahí se activa. Idempotente por payment_id.
//  5. Se responde rápido y se registra todo en la hoja webhook_log.

// Estados de MP que implican que la plata volvió al cliente.
const REVERSED_STATUSES = ['refunded', 'charged_back', 'cancelled']

export default async function handler(req, res) {
  // Diagnóstico: GET a esta ruta dice si el webhook está listo, sin exponer nada.
  if (req.method === 'GET') {
    const config = mpConfig()
    const secreto = String(config.webhookSecret || '').trim().replace(/^["']|["']$/g, '')
    return sendJson(res, 200, {
      ruta: '/api/webhook-mercadopago',
      metodo: 'Mercado Pago manda POST',
      accesoTokenConfigurado: Boolean(config.accessToken),
      secretoConfigurado: Boolean(secreto),
      secretoLargo: secreto.length,
      urlPublicaConfigurada: Boolean(config.appUrl),
      nota: 'Si secretoConfigurado es false, todos los avisos se rechazan y los pedidos nunca se activan solos.',
    })
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' })

  const startedAt = Date.now()
  // El secreto se pega a mano en Vercel: se limpian espacios, saltos de línea
  // y comillas que se cuelan al copiar. Una comilla de más = firma inválida.
  const webhookSecret = String(mpConfig().webhookSecret || '').trim().replace(/^["']|["']$/g, '')

  let body = {}
  try { body = await readJson(req) } catch { body = {} }

  // El id del pago puede venir en el body o en el query (?data.id=...&type=payment)
  const url = new URL(req.url, 'http://localhost')
  const dataId = String(body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || '')
  const type = String(body?.type || url.searchParams.get('type') || body?.topic || '')

  const signature = req.headers['x-signature']
  const requestId = req.headers['x-request-id']

  // ── 1. Firma ──────────────────────────────────────────────────────────
  const check = verifyWebhookSignature({ signature, requestId, dataId, secret: webhookSecret })
  if (!check.ok) {
    console.warn('[webhook] firma inválida:', check.reason, { dataId, type })
    // Pista en el header: permite ver el motivo desde afuera sin abrir logs.
    res.setHeader('x-invitafigus-webhook', `firma:${String(check.reason).replace(/[^a-zA-Z0-9 _:-]/g, '')}`)
    await logEvent({
      payment_id: dataId, status: type, firma_ok: 'NO', monto_ok: '',
      resultado: 'rechazado_firma', detalle: check.reason,
    })
    return sendJson(res, 401, { error: 'Firma inválida' })
  }

  // Solo nos interesan eventos de pago. Los demás se aceptan y se ignoran.
  const ES_PAGO = !type || type === 'payment' || type === 'merchant_order'
  if (!ES_PAGO) return sendJson(res, 200, { ok: true, ignored: type })
  if (!dataId) return sendJson(res, 200, { ok: true, ignored: 'sin data.id' })

  // Checkout Pro a veces avisa con merchant_order (la "orden" que contiene el
  // pago). Se resuelve el pago real antes de seguir.
  let idDelPago = dataId
  if (type === 'merchant_order') {
    try {
      const orden = await getMerchantOrder(dataId)
      if (!orden.payment_id) {
        await logEvent({
          payment_id: dataId, status: 'orden_sin_pago', firma_ok: 'SI', monto_ok: '',
          resultado: 'orden_sin_pago', detalle: 'La orden todavia no tiene pagos',
        })
        return sendJson(res, 200, { ok: true, ignored: 'orden_sin_pago' })
      }
      idDelPago = orden.payment_id
    } catch (error) {
      await logEvent({
        payment_id: dataId, status: 'error_orden', firma_ok: 'SI', monto_ok: '',
        resultado: 'error', detalle: error.message,
      })
      return sendJson(res, 200, { ok: true, ignored: 'orden_ilegible' })
    }
  }

  // ── 2. Releer el pago real en MP ──────────────────────────────────────
  let payment
  try {
    payment = await getPayment(idDelPago)
  } catch (error) {
    // 404 = ese pago no existe en Mercado Pago. Pasa siempre con el botón
    // "Simular notificación" del panel (manda un id inventado) y también si
    // MP reintenta un aviso de una preferencia que nunca se pagó.
    // Se responde 200 y se anota: reintentar no cambia nada y, si no, el
    // panel marca la URL como rota y MP reintenta cada 15 min para siempre.
    if (error.status === 404 || /404|not found/i.test(String(error.message))) {
      console.warn('[webhook] pago inexistente en MP:', dataId)
      await logEvent({
        payment_id: dataId, status: 'no_existe', firma_ok: 'SI', monto_ok: '',
        resultado: 'pago_inexistente', detalle: 'MP no tiene ese id (simulacion o preferencia impaga)',
      })
      return sendJson(res, 200, { ok: true, ignored: 'pago_inexistente' })
    }
    console.error('[webhook] no se pudo leer el pago:', error.message)
    await logEvent({
      payment_id: dataId, status: 'error_lectura', firma_ok: 'SI', monto_ok: '',
      resultado: 'error', detalle: error.message,
    })
    // 500 para que MP reintente más tarde (falla de red o de MP, no del pago).
    return sendJson(res, 500, { error: 'No se pudo verificar el pago' })
  }

  const base = {
    payment_id: payment.id,
    status: payment.status,
    monto: payment.transaction_amount,
    firma_ok: 'SI',
  }

  // ── 3. Verificaciones ─────────────────────────────────────────────────

  // 3.a · Devoluciones y contracargos: DESACTIVAN el pedido.
  // El link deja de abrir. No se borra nada (queda la fila para auditar).
  if (REVERSED_STATUSES.includes(payment.status)) {
    const motivo = payment.status === 'charged_back' ? 'CONTRACARGO' : 'REEMBOLSADA'
    try {
      const order = await readFromSheets('getOrder', { orderId: payment.external_reference })
      if (!order) {
        await logEvent({
          ...base, order_id: payment.external_reference, monto_ok: 'SI',
          resultado: 'reverso_sin_pedido', detalle: payment.status,
        })
        return sendJson(res, 200, { ok: true, ignored: 'pedido_inexistente' })
      }
      if (order.estado === motivo) {
        await logEvent({
          ...base, order_id: payment.external_reference, monto_ok: 'SI',
          resultado: 'duplicado', detalle: `Ya estaba ${motivo}`,
        })
        return sendJson(res, 200, { ok: true, duplicate: true, estado: motivo })
      }
      await writeToSheetsWithRetry('deactivateOrder', {
        order_id: payment.external_reference,
        slug: order.slug,
        payment_id: payment.id,
        motivo,
      })
      await logEvent({
        ...base, order_id: payment.external_reference, monto_ok: 'SI',
        resultado: motivo.toLowerCase(), detalle: payment.status_detail || payment.status,
      })
      return sendJson(res, 200, { ok: true, slug: order.slug, estado: motivo })
    } catch (error) {
      await logEvent({
        ...base, order_id: payment.external_reference, monto_ok: '',
        resultado: 'error_reverso', detalle: error.message,
      })
      // 500 → MP reintenta; la operación es idempotente.
      return sendJson(res, 500, { error: 'No se pudo desactivar' })
    }
  }

  if (payment.status !== 'approved') {
    await logEvent({
      ...base, order_id: payment.external_reference, monto_ok: '',
      resultado: 'no_aprobado', detalle: payment.status_detail || payment.status,
    })
    return sendJson(res, 200, { ok: true, ignored: payment.status })
  }

  if (!isAllowedAmount(payment.transaction_amount)) {
    await logEvent({
      ...base, order_id: payment.external_reference, monto_ok: 'NO',
      resultado: 'monto_invalido', detalle: `Monto ${payment.transaction_amount} no permitido`,
    })
    return sendJson(res, 200, { ok: true, error: 'monto_invalido' })
  }

  const expectedPlan = planForAmount(payment.transaction_amount)
  const orderId = payment.external_reference

  let order
  try {
    order = await readFromSheets('getOrder', { orderId })
  } catch (error) {
    await logEvent({
      ...base, order_id: orderId, monto_ok: 'SI',
      resultado: 'pedido_inexistente', detalle: error.message,
    })
    return sendJson(res, 200, { ok: true, error: 'pedido_inexistente' })
  }

  if (!order) {
    await logEvent({
      ...base, order_id: orderId, monto_ok: 'SI', resultado: 'pedido_inexistente', detalle: '',
    })
    return sendJson(res, 200, { ok: true, error: 'pedido_inexistente' })
  }

  // Idempotencia: mismo payment ya aplicado a esta orden.
  if (order.estado === 'ACTIVA' && String(order.payment_id || '') === String(payment.id)) {
    await logEvent({
      ...base, order_id: orderId, monto_ok: 'SI',
      resultado: 'duplicado', detalle: 'Ya estaba activada con este pago',
    })
    return sendJson(res, 200, { ok: true, duplicate: true, slug: order.slug })
  }

  // Monto vs plan registrado: si el pedido decía base y pagó completo (o al revés),
  // se activa igual el pago real, pero queda registrado en el detalle para auditar.
  const mismatch = order.plan && planForAmount(payment.transaction_amount) !== order.plan

  // ── 4. Activar ────────────────────────────────────────────────────────
  try {
    const result = await writeToSheetsWithRetry('activateOrder', {
      order_id: orderId,
      slug: order.slug,
      payment_id: payment.id,
    })
    await logEvent({
      ...base, order_id: orderId, monto_ok: 'SI',
      resultado: result?.data?.already ? 'duplicado' : 'activada',
      detalle: `plan=${expectedPlan}${mismatch ? ' (plan registrado distinto)' : ''} ${Date.now() - startedAt}ms`,
    })
    return sendJson(res, 200, { ok: true, slug: order.slug, activated: true })
  } catch (error) {
    await logEvent({
      ...base, order_id: orderId, monto_ok: 'SI',
      resultado: 'error_activacion', detalle: error.message,
    })
    // 500 → MP reintenta. La idempotencia evita duplicados.
    return sendJson(res, 500, { error: 'No se pudo activar' })
  }
}

async function logEvent(fields) {
  try {
    await writeToSheets('logWebhook', {
      payment_id: fields.payment_id || '',
      order_id: fields.order_id || '',
      status: fields.status || '',
      monto: fields.monto || 0,
      firma_ok: fields.firma_ok || '',
      monto_ok: fields.monto_ok || '',
      resultado: fields.resultado || '',
      detalle: fields.detalle || '',
    })
  } catch (error) {
    console.error('[webhook] no se pudo escribir el log:', error.message)
  }
}
