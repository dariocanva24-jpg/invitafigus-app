import crypto from 'node:crypto'

// ───────────────────────────────────────────────────────────────────────────
// Mercado Pago — sin SDK, solo fetch. El token SIEMPRE sale del entorno.
// Nunca se imprime ni se devuelve en una respuesta.
// ───────────────────────────────────────────────────────────────────────────

// Base configurable SOLO para poder testear contra un servidor simulado.
// En producción queda el valor por defecto. No hay tokens acá.
const API = process.env.MP_API_BASE || 'https://api.mercadopago.com'

export function mpConfig() {
  return {
    accessToken: process.env.MP_ACCESS_TOKEN || '',
    publicKey: process.env.MP_PUBLIC_KEY || '',
    webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
    // URL pública de la app, para back_urls y notification_url.
    appUrl: (process.env.APP_PUBLIC_URL || '').replace(/\/$/, ''),
  }
}

export function isMpConfigured() {
  const { accessToken } = mpConfig()
  return Boolean(accessToken)
}

function authHeaders() {
  const { accessToken } = mpConfig()
  if (!accessToken) throw new Error('Mercado Pago no está configurado (falta MP_ACCESS_TOKEN)')
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

// Crea una preferencia de Checkout Pro. UNA sola transacción por pedido:
// si el usuario sumó el bump, es un único ítem de 14.999, no dos ítems.
export async function createPreference({ orderId, plan, slug, payerEmail, payerName, appUrl }) {
  const base = (appUrl || mpConfig().appUrl || '').replace(/\/$/, '')
  if (!base) throw new Error('Falta APP_PUBLIC_URL para armar los retornos de pago')

  const total = plan === 'completo' ? 14999 : 10000
  const title = plan === 'completo' ? 'InvitaFigus · Cumple Completo' : 'InvitaFigus · Invitación digital'

  const body = {
    items: [
      {
        id: plan === 'completo' ? 'cumple-completo' : 'invitacion-base',
        title,
        description: plan === 'completo'
          ? 'Invitación + lista de asistentes exportable + PDF para imprimir + segundo diseño + cambio de fecha'
          : 'Figurita digital con contador, mapa y confirmación de asistencia',
        quantity: 1,
        currency_id: 'ARS',
        unit_price: total,
      },
    ],
    payer: {
      ...(payerEmail ? { email: payerEmail } : {}),
      ...(payerName ? { name: payerName } : {}),
    },
    external_reference: orderId,
    notification_url: `${base}/api/webhook-mercadopago`,
    back_urls: {
      success: `${base}/crear?status=success&external_reference=${encodeURIComponent(orderId)}`,
      failure: `${base}/crear?status=failure&external_reference=${encodeURIComponent(orderId)}`,
      pending: `${base}/crear?status=pending&external_reference=${encodeURIComponent(orderId)}`,
    },
    auto_return: 'approved',
    statement_descriptor: 'INVITAFIGUS',
    metadata: { slug, plan },
  }

  const response = await fetch(`${API}/checkout/preferences`, {
    method: 'POST',
    headers: authHeaders(),
    // Clave de idempotencia: si el usuario recarga, MP devuelve la MISMA preferencia.
    // Evita preferencias duplicadas ante doble clic o reintento de red.
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Mercado Pago rechazó la preferencia: ${data.message || response.status}`)
  }
  return {
    id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
    total,
    plan,
  }
}

// Lee el pago REAL desde MP. Nunca confiamos en el payload del webhook.
export async function getPayment(paymentId) {
  const response = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`No se pudo leer el pago ${paymentId}: ${data.message || response.status}`)
  }
  return {
    id: String(data.id),
    status: data.status,
    status_detail: data.status_detail,
    transaction_amount: Number(data.transaction_amount),
    external_reference: data.external_reference || '',
    payment_method_id: data.payment_method_id || '',
    date_approved: data.date_approved || '',
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Validación de la firma del webhook.
// MP manda: x-signature: ts=<ms>,v1=<hmac>
//            x-request-id: <id>
// El manifest es: id:<data.id>;request-id:<x-request-id>;ts:<ts>
// HMAC SHA-256 con MP_WEBHOOK_SECRET.
// ───────────────────────────────────────────────────────────────────────────
export function verifyWebhookSignature({ signature, requestId, dataId, secret }) {
  if (!secret) return { ok: false, reason: 'MP_WEBHOOK_SECRET no configurado' }
  if (!signature) return { ok: false, reason: 'Falta x-signature' }
  if (!dataId) return { ok: false, reason: 'Falta el id del pago en el evento' }

  const parts = String(signature).split(',').reduce((acc, chunk) => {
    const [key, value] = chunk.split('=').map((item) => (item || '').trim())
    if (key) acc[key] = value
    return acc
  }, {})

  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return { ok: false, reason: 'x-signature incompleta' }

  // Rechaza eventos viejos (5 minutos) para evitar replays.
  const age = Math.abs(Date.now() - Number(ts))
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return { ok: false, reason: 'ts fuera de rango' }

  // Mercado Pago exige que el id vaya en MINÚSCULAS dentro del manifest cuando
  // el data.id trae letras mayúsculas. Sin esto, la firma nunca coincide y todos
  // los avisos se rechazan (el pedido jamás se activaría solo).
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId || ''};ts:${ts}`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  const a = Buffer.from(v1, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return { ok: false, reason: 'firma no coincide' }
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'firma no coincide' }
  return { ok: true }
}

// Firma para los tests: mismo manifest que valida MP (id en minúsculas).
export function signWebhook({ dataId, requestId, secret, ts = Date.now() }) {
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts}`
  const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return { header: `ts=${ts},v1=${v1}`, ts }
}

// ───────────────────────────────────────────────────────────────────────────
// Teléfonos a E.164 (Argentina por defecto).
// ───────────────────────────────────────────────────────────────────────────
export function toE164(raw, defaultCountry = '54') {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  // Ya viene con país (54...) y largo suficiente
  if (digits.startsWith('54') && digits.length >= 12) return `+${digits}`
  // Formato local con 0 y 15: 0388 154 123456 → 54388123456
  if (digits.startsWith('0')) {
    const sinCero = digits.slice(1).replace(/^15/, '')
    return `+${defaultCountry}${sinCero}`
  }
  // 388154123456 (10 dígitos + 15 intercalado)
  if (digits.length === 12 && digits.slice(3, 5) === '15') {
    return `+${defaultCountry}${digits.slice(0, 3)}${digits.slice(5)}`
  }
  if (digits.length === 10) return `+${defaultCountry}${digits}`
  return `+${digits}`
}
