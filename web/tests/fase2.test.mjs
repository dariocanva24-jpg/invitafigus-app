/**
 * Tests de la Fase 2 — corren SIN credenciales reales.
 *
 * Monta un servidor que imita a Mercado Pago (preferencias + GET /v1/payments)
 * y una planilla en memoria, y ejecuta los handlers reales de la app.
 *
 * Uso:  node tests/fase2.test.mjs
 * Sale con código 1 si algo falla.
 */

process.env.MP_ACCESS_TOKEN = 'test-token-fake-no-real'
process.env.MP_WEBHOOK_SECRET = 'secreto-de-prueba'
process.env.APP_PUBLIC_URL = 'https://app.example.com'

import http from 'node:http'
import crypto from 'node:crypto'

// ── Servidor que imita a Mercado Pago ────────────────────────────────────
const payments = new Map()   // id -> payment
const preferences = new Map() // id -> preference
const merchantOrders = new Map() // id -> orden de pago
let prefCounter = 0
let payCounter = 0

const mp = http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => { body += c })
  req.on('end', () => {
    const url = new URL(req.url, 'http://x')
    res.setHeader('Content-Type', 'application/json')

    if (url.pathname === '/checkout/preferences' && req.method === 'POST') {
      const payload = JSON.parse(body || '{}')
      const id = `pref-${++prefCounter}`
      preferences.set(id, { ...payload, id })
      return res.end(JSON.stringify({
        id,
        init_point: `https://mp.example/checkout/${id}`,
        sandbox_init_point: `https://sandbox.mp.example/checkout/${id}`,
      }))
    }

    const prefMatch = url.pathname.match(/^\/checkout\/preferences\/(.+)$/)
    if (prefMatch) {
      const pref = preferences.get(prefMatch[1])
      if (!pref) { res.statusCode = 404; return res.end('{}') }
      return res.end(JSON.stringify({
        id: pref.id,
        init_point: `https://mp.example/checkout/${pref.id}`,
        sandbox_init_point: `https://sandbox.mp.example/checkout/${pref.id}`,
      }))
    }

    const moMatch = url.pathname.match(/^\/merchant_orders\/(.+)$/)
    if (moMatch) {
      const orden = merchantOrders.get(moMatch[1])
      if (!orden) { res.statusCode = 404; return res.end(JSON.stringify({ message: 'not found' })) }
      return res.end(JSON.stringify(orden))
    }

    if (url.pathname === '/v1/payments/search') {
      const ref = url.searchParams.get('external_reference')
      const results = [...payments.values()].filter((p) => p.external_reference === ref)
      return res.end(JSON.stringify({ results }))
    }

    const payMatch = url.pathname.match(/^\/v1\/payments\/(.+)$/)
    if (payMatch) {
      const payment = payments.get(payMatch[1])
      if (!payment) { res.statusCode = 404; return res.end(JSON.stringify({ message: 'not found' })) }
      return res.end(JSON.stringify(payment))
    }

    res.statusCode = 404
    res.end('{}')
  })
})

const MP_PORT = Number(process.env.TEST_MP_PORT || 4555)
const SHEETS_PORT = Number(process.env.TEST_SHEETS_PORT || 4556)
await new Promise((resolve) => mp.listen(MP_PORT, resolve))
process.env.MP_API_BASE = `http://localhost:${MP_PORT}`

// ── Planilla en memoria (imita las respuestas de Apps Script) ────────────
const sheetOrders = new Map()
const sheetLogs = []
const sheetCalls = []

const fakeSheets = http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => { body += c })
  req.on('end', () => {
    const url = new URL(req.url, 'http://x')
    const params = {
      ...Object.fromEntries(url.searchParams),
      ...Object.fromEntries(new URLSearchParams(body)),
    }
    const action = url.searchParams.get('action')
    sheetCalls.push({ action, params })
    res.setHeader('Content-Type', 'application/json')
    const ok = (data) => res.end(JSON.stringify({ success: true, data }))

    if (action === 'getBySlug') {
      const found = [...sheetOrders.values()].find((o) => o.slug === params.slug)
      if (!found) return ok(null)
      const estado = String(found.estado || '').toUpperCase()
      const pagada = ['ACTIVA', 'REEMBOLSADA', 'CONTRACARGO'].includes(estado)
      if (!pagada) {
        // Igual que el Apps Script: sin modo=compartir un borrador NO se publica.
        if (params.modo === 'compartir') {
          return ok({ slug: found.slug, nombre: found.nombre || found.slug, estado, borrador: true })
        }
        return ok(null)
      }
      return ok(found)
    }

    if (action === 'getOrder') {
      const found = [...sheetOrders.values()].find((o) =>
        (params.slug && o.slug === params.slug) || (params.orderId && o.order_id === params.orderId))
      if (!found) return res.end(JSON.stringify({ success: false, error: 'Pedido inexistente' }))
      return ok(found)
    }

    if (action === 'setPreference') {
      const order = sheetOrders.get(params.slug)
      if (!order) return res.end(JSON.stringify({ success: false, error: 'Pedido inexistente' }))
      order.order_id = params.order_id
      order.plan = params.plan
      order.monto = Number(params.monto)
      order.preference_id = params.preference_id
      return ok({ slug: order.slug, saved: true })
    }

    if (action === 'activateOrder') {
      const order = [...sheetOrders.values()].find((o) => o.order_id === params.order_id)
      if (!order) return res.end(JSON.stringify({ success: false, error: 'Pedido inexistente' }))
      if (order.estado === 'ACTIVA' && order.payment_id === params.payment_id) {
        return ok({ slug: order.slug, estado: 'ACTIVA', activated: false, already: true })
      }
      order.estado = 'ACTIVA'
      order.payment_id = params.payment_id
      order.activated_at = new Date().toISOString()
      return ok({ slug: order.slug, estado: 'ACTIVA', activated: true, already: false })
    }

    if (action === 'deactivateOrder') {
      const order = [...sheetOrders.values()].find((o) => o.order_id === params.order_id)
      if (!order) return res.end(JSON.stringify({ success: false, error: 'Pedido inexistente' }))
      order.estado = params.motivo || 'REEMBOLSADA'
      return ok({ slug: order.slug, estado: order.estado, deactivated: true })
    }

    if (action === 'getAudit') {
      return ok({ orders: [...sheetOrders.values()], logs: sheetLogs })
    }

    if (action === 'rsvpCount') {
      return ok({ total: 0, confirmed: 0, guests: 0, messages: [] })
    }

    if (action === 'addRSVP') {
      return ok({ saved: true, count: { total: 1, confirmed: 1, guests: Number(params.acompanantes) || 0 }, messages: [{ nombre: params.nombre, mensaje: params.notas }] })
    }

    if (action === 'logWebhook') {
      sheetLogs.push(params)
      return ok({ logged: true })
    }

    if (action === 'createInvitation') {
      sheetOrders.set(params.slug, {
        slug: params.slug,
        order_id: params.order_id || '',
        plan: params.plan || 'base',
        monto: Number(params.monto) || 0,
        estado: String(params.estado || 'PENDIENTE').toUpperCase(),
        nombre: params.nombre || '',
        payment_id: '',
      })
      return ok({ slug: params.slug, saved: true })
    }

    return ok({})
  })
})

await new Promise((resolve) => fakeSheets.listen(SHEETS_PORT, resolve))
process.env.APPS_SCRIPT_URL = `http://localhost:${SHEETS_PORT}/exec`

// ── Cargar los handlers reales de la app ─────────────────────────────────
const { default: checkoutPreference } = await import('../lib/api/checkout-preference.js')
const { default: webhook } = await import('../lib/api/webhook-mercadopago.js')
const { default: invitations } = await import('../lib/api/invitations.js')
const { signWebhook } = await import('../lib/server/mercadopago.js')

// ── Mini arnés para invocar handlers (req/res estilo Node) ───────────────
function callHandler(handler, { method = 'POST', url = '/', body = {}, headers = {} }) {
  return new Promise((resolve) => {
    const req = new (class extends http.IncomingMessage {
      constructor() {
        super({})
        this.method = method
        this.url = url
        this.headers = { 'content-type': 'application/json', ...headers }
        this.body = body
      }
    })()
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v },
      end(payload) {
        let json = {}
        try { json = JSON.parse(payload) } catch {}
        resolve({ status: this.statusCode, body: json, headers: this.headers })
      },
    }
    Promise.resolve(handler(req, res)).catch((error) => {
      resolve({ status: 500, body: { error: error.message } })
    })
  })
}

let passed = 0
let failed = 0
function check(name, condition, extra = '') {
  if (condition) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name}${extra ? ` → ${extra}` : ''}`) }
}

const SECRET = process.env.MP_WEBHOOK_SECRET

function makePayment({ id, amount, reference, status = 'approved' }) {
  payments.set(String(id), {
    id: Number(id),
    status,
    status_detail: status === 'approved' ? 'accredited' : 'pending_review',
    transaction_amount: amount,
    external_reference: reference,
    payment_method_id: 'visa',
    date_approved: new Date().toISOString(),
  })
}

function signedWebhookData(id) {
  return signWebhook({ dataId: String(id), requestId: 'req-123', secret: SECRET })
}

// ────────────────────────────────────────────────────────────────────────
console.log('\n▶ TEST 1 · Pedido base: precio lo pone el servidor')
{
  await callHandler(invitations, {
    body: { action: 'create', invitation: { slug: 'lucas-8-boca', childName: 'Lucas', honoreeAge: 8, team: 'boca' }, plan: 'base' },
  })
  // El cliente intenta forzar un monto ridículo: el servidor lo ignora.
  const result = await callHandler(checkoutPreference, {
    body: { slug: 'lucas-8-boca', plan: 'base', amount: 1, baseUrl: 'https://app.example.com' },
  })
  const pref = preferences.get(result.body.preferenceId)
  check('responde 201', result.status === 201, `status ${result.status} ${JSON.stringify(result.body)}`)
  check('total = 10000', result.body.total === 10000, String(result.body.total))
  check('UN solo ítem', pref.items.length === 1, `${pref.items.length} ítems`)
  check('unit_price = 10000', pref.items[0].unit_price === 10000, String(pref.items[0].unit_price))
  check('ignora el amount del cliente (no cobra $1)', pref.items[0].unit_price !== 1)
  check('external_reference = order_id', pref.external_reference === 'IF-lucas-8-boca-base', pref.external_reference)
  check('notification_url apunta al webhook', String(pref.notification_url).endsWith('/api/webhook-mercadopago'), pref.notification_url)
  check('tiene auto_return', pref.auto_return === 'approved')
  check('tiene back_urls', Boolean(pref.back_urls?.success && pref.back_urls?.failure && pref.back_urls?.pending))
}

console.log('\n▶ TEST 2 · Bump: UNA sola preferencia de 14.999')
{
  await callHandler(invitations, {
    body: { action: 'create', invitation: { slug: 'sofia-9-river', childName: 'Sofía', honoreeAge: 9, team: 'river' }, plan: 'completo' },
  })
  const result = await callHandler(checkoutPreference, {
    body: { slug: 'sofia-9-river', plan: 'completo', baseUrl: 'https://app.example.com' },
  })
  const pref = preferences.get(result.body.preferenceId)
  check('total = 14999', result.body.total === 14999, String(result.body.total))
  check('UN solo ítem (no dos cobros)', pref.items.length === 1, `${pref.items.length} ítems`)
  check('unit_price = 14999', pref.items[0].unit_price === 14999, String(pref.items[0].unit_price))
  const total = pref.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  check('suma de ítems = 14999', total === 14999, String(total))
}

console.log('\n▶ TEST 3 · Idempotencia de la preferencia (recarga del usuario)')
{
  const before = preferences.size
  const again = await callHandler(checkoutPreference, {
    body: { slug: 'sofia-9-river', plan: 'completo', baseUrl: 'https://app.example.com' },
  })
  check('responde 200', again.status === 200, String(again.status))
  check('reused = true', again.body.reused === true)
  check('NO se creó otra preferencia', preferences.size === before, `${preferences.size} vs ${before}`)
}

console.log('\n▶ TEST 4 · Webhook válido → ACTIVA (sin intervención)')
{
  makePayment({ id: 900001, amount: 10000, reference: 'IF-lucas-8-boca-base' })
  const { header } = signedWebhookData(900001)
  const result = await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900001' } },
    headers: { 'x-signature': header, 'x-request-id': 'req-123' },
  })
  check('responde 200', result.status === 200, `${result.status} ${JSON.stringify(result.body)}`)
  check('activated = true', result.body.activated === true)
  check('pedido ACTIVA en la planilla', sheetOrders.get('lucas-8-boca').estado === 'ACTIVA')
  check('payment_id guardado', sheetOrders.get('lucas-8-boca').payment_id === '900001')
  check('quedó log de la activación', sheetLogs.some((l) => l.resultado === 'activada'))
}

console.log('\n▶ TEST 5 · Webhook repetido → 200 y NO duplica')
{
  const { header } = signedWebhookData(900001)
  const activationsBefore = sheetLogs.filter((l) => l.resultado === 'activada').length
  const result = await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900001' } },
    headers: { 'x-signature': header, 'x-request-id': 'req-123' },
  })
  const activationsAfter = sheetLogs.filter((l) => l.resultado === 'activada').length
  check('responde 200', result.status === 200, String(result.status))
  check('marca duplicate', result.body.duplicate === true)
  check('no hubo nueva activación', activationsAfter === activationsBefore, `${activationsBefore} → ${activationsAfter}`)
  check('quedó log "duplicado"', sheetLogs.some((l) => l.resultado === 'duplicado'))
}

console.log('\n▶ TEST 6 · Firma inválida → 401 y pedido intacto')
{
  await callHandler(invitations, {
    body: { action: 'create', invitation: { slug: 'mateo-10-velez', childName: 'Mateo', honoreeAge: 10, team: 'velez' }, plan: 'base' },
  })
  makePayment({ id: 900002, amount: 10000, reference: 'IF-mateo-10-velez-base' })
  const result = await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900002' } },
    headers: { 'x-signature': 'ts=' + Date.now() + ',v1=firmafalsa', 'x-request-id': 'req-123' },
  })
  check('responde 401', result.status === 401, String(result.status))
  check('pedido sigue sin activar (BORRADOR)', ['PENDIENTE','BORRADOR'].includes(sheetOrders.get('mateo-10-velez').estado))
  check('quedó log rechazado_firma', sheetLogs.some((l) => l.resultado === 'rechazado_firma'))
}

console.log('\n▶ TEST 7 · Firma ausente → 401')
{
  const result = await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900002' } },
    headers: {},
  })
  check('responde 401', result.status === 401, String(result.status))
}

console.log('\n▶ TEST 8 · Monto que no coincide → NO activa')
{
  makePayment({ id: 900003, amount: 5000, reference: 'IF-mateo-10-velez-base' })
  const { header } = signedWebhookData(900003)
  const result = await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900003' } },
    headers: { 'x-signature': header, 'x-request-id': 'req-123' },
  })
  check('responde 200 (no reintenta)', result.status === 200, String(result.status))
  check('error monto_invalido', result.body.error === 'monto_invalido', JSON.stringify(result.body))
  check('pedido sigue sin activar (BORRADOR)', ['PENDIENTE','BORRADOR'].includes(sheetOrders.get('mateo-10-velez').estado))
  check('quedó log monto_invalido', sheetLogs.some((l) => l.resultado === 'monto_invalido'))
}

console.log('\n▶ TEST 9 · Pago no aprobado → NO activa')
{
  makePayment({ id: 900004, amount: 10000, reference: 'IF-mateo-10-velez-base', status: 'pending' })
  const { header } = signedWebhookData(900004)
  const result = await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900004' } },
    headers: { 'x-signature': header, 'x-request-id': 'req-123' },
  })
  check('ignora el pago pending', result.body.ignored === 'pending', JSON.stringify(result.body))
  check('pedido sigue sin activar (BORRADOR)', ['PENDIENTE','BORRADOR'].includes(sheetOrders.get('mateo-10-velez').estado))
}

console.log('\n▶ TEST 10 · Pedido inexistente en el external_reference')
{
  makePayment({ id: 900005, amount: 10000, reference: 'IF-pedido-inventado-base' })
  const { header } = signedWebhookData(900005)
  const result = await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900005' } },
    headers: { 'x-signature': header, 'x-request-id': 'req-123' },
  })
  check('no activa', result.body.error === 'pedido_inexistente', JSON.stringify(result.body))
  check('quedó log pedido_inexistente', sheetLogs.some((l) => l.resultado === 'pedido_inexistente'))
}

console.log('\n▶ TEST 11 · Condición de carrera: dos webhooks simultáneos del mismo pago')
{
  await callHandler(invitations, {
    body: { action: 'create', invitation: { slug: 'juan-7-sanlorenzo', childName: 'Juan', honoreeAge: 7, team: 'san-lorenzo' }, plan: 'completo' },
  })
  // La preferencia es la que fija el order_id (igual que en el flujo real).
  await callHandler(checkoutPreference, {
    body: { slug: 'juan-7-sanlorenzo', plan: 'completo', baseUrl: 'https://app.example.com' },
  })
  makePayment({ id: 900006, amount: 14999, reference: 'IF-juan-7-sanlorenzo-completo' })
  const { header } = signedWebhookData(900006)
  const [a, b] = await Promise.all([
    callHandler(webhook, { url: '/api/webhook-mercadopago', body: { type: 'payment', data: { id: '900006' } }, headers: { 'x-signature': header, 'x-request-id': 'req-123' } }),
    callHandler(webhook, { url: '/api/webhook-mercadopago', body: { type: 'payment', data: { id: '900006' } }, headers: { 'x-signature': header, 'x-request-id': 'req-123' } }),
  ])
  check('ambos responden 200', a.status === 200 && b.status === 200, `${a.status}/${b.status}`)
  check('pedido ACTIVA una sola vez', sheetOrders.get('juan-7-sanlorenzo').estado === 'ACTIVA')
  check('un solo payment_id', sheetOrders.get('juan-7-sanlorenzo').payment_id === '900006')
}

console.log('\n▶ TEST 12 · Escenario sábado 23:40 (extremo a extremo)')
{
  const started = Date.now()
  await callHandler(invitations, {
    body: { action: 'create', invitation: { slug: 'sabado-2340-test', childName: 'Test', honoreeAge: 8, team: 'argentina' }, plan: 'base' },
  })
  const pref = await callHandler(checkoutPreference, {
    body: { slug: 'sabado-2340-test', plan: 'base', baseUrl: 'https://app.example.com' },
  })
  check('se creó la preferencia', Boolean(pref.body.initPoint))
  makePayment({ id: 900007, amount: 10000, reference: 'IF-sabado-2340-test-base' })
  const { header } = signedWebhookData(900007)
  await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900007' } },
    headers: { 'x-signature': header, 'x-request-id': 'req-123' },
  })
  const order = sheetOrders.get('sabado-2340-test')
  const elapsed = Date.now() - started
  check('ACTIVA sin intervención humana', order.estado === 'ACTIVA')
  check(`tiempo total < 2 minutos (${elapsed} ms)`, elapsed < 120000, `${elapsed} ms`)
}

console.log('\n▶ TEST 13 · Reembolso → el pedido se DESACTIVA')
{
  makePayment({ id: 900010, amount: 10000, reference: 'IF-sabado-2340-test-base' })
  // Primero el pago aprobado normal (el pedido ya venía activo del test 12,
  // así que usamos uno nuevo para probar el reverso limpio).
  await callHandler(invitations, {
    body: { action: 'create', invitation: { slug: 'reembolso-test', childName: 'Reembolso', honoreeAge: 8, team: 'boca' }, plan: 'base' },
  })
  await callHandler(checkoutPreference, { body: { slug: 'reembolso-test', plan: 'base', baseUrl: 'https://app.example.com' } })
  makePayment({ id: 900011, amount: 10000, reference: 'IF-reembolso-test-base' })
  let sign = signedWebhookData(900011)
  await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900011' } },
    headers: { 'x-signature': sign.header, 'x-request-id': 'req-123' },
  })
  check('activado antes del reembolso', sheetOrders.get('reembolso-test').estado === 'ACTIVA')

  // Ahora MP devuelve el mismo pago como reembolsado
  makePayment({ id: 900011, amount: 10000, reference: 'IF-reembolso-test-base', status: 'refunded' })
  sign = signedWebhookData(900011)
  const result = await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900011' } },
    headers: { 'x-signature': sign.header, 'x-request-id': 'req-123' },
  })
  check('responde 200', result.status === 200, String(result.status))
  check('estado REEMBOLSADA', sheetOrders.get('reembolso-test').estado === 'REEMBOLSADA', sheetOrders.get('reembolso-test').estado)
  check('quedó log reembolsada', sheetLogs.some((l) => l.resultado === 'reembolsada'))
}

console.log('\n▶ TEST 14 · Contracargo → estado CONTRACARGO')
{
  makePayment({ id: 900011, amount: 10000, reference: 'IF-reembolso-test-base', status: 'charged_back' })
  const sign = signedWebhookData(900011)
  const result = await callHandler(webhook, {
    url: '/api/webhook-mercadopago',
    body: { type: 'payment', data: { id: '900011' } },
    headers: { 'x-signature': sign.header, 'x-request-id': 'req-123' },
  })
  check('responde 200', result.status === 200, String(result.status))
  check('estado CONTRACARGO', sheetOrders.get('reembolso-test').estado === 'CONTRACARGO', sheetOrders.get('reembolso-test').estado)
}

console.log('\n▶ TEST 15 · Reconciliación activa un pago que el webhook perdió')
{
  await callHandler(invitations, {
    body: { action: 'create', invitation: { slug: 'perdido-test', childName: 'Perdido', honoreeAge: 9, team: 'river' }, plan: 'completo' },
  })
  await callHandler(checkoutPreference, { body: { slug: 'perdido-test', plan: 'completo', baseUrl: 'https://app.example.com' } })
  // El pago existe y está aprobado en MP, pero el webhook NUNCA llegó.
  makePayment({ id: 900020, amount: 14999, reference: 'IF-perdido-test-completo' })
  check('antes de reconciliar está sin activar', ['PENDIENTE','BORRADOR'].includes(sheetOrders.get('perdido-test').estado))

  const { reconcilePendingOrders } = await import('../lib/server/reconcile.js')
  const result = await reconcilePendingOrders()
  check('reconciliación OK', result.ok === true)
  check('activó el pedido perdido', result.activados.some((a) => a.slug === 'perdido-test'), JSON.stringify(result.activados))
  check('estado ACTIVA después', sheetOrders.get('perdido-test').estado === 'ACTIVA')
  check('payment_id correcto', sheetOrders.get('perdido-test').payment_id === '900020')

  // Correrla de nuevo no debe duplicar ni romper.
  const again = await reconcilePendingOrders()
  check('idempotente (no vuelve a activar)', !again.activados.some((a) => a.slug === 'perdido-test'))
}

console.log('\n▶ TEST 16 · Secreto compartido con Apps Script (si está configurado)')
{
  const { readFromSheets } = await import('../lib/server/sheets.js')
  process.env.APPS_SCRIPT_SECRET = 'secreto-de-planilla'
  const antes = sheetCalls.length
  await readFromSheets('getOrder', { slug: 'no-existe' }).catch(() => {})
  const call = sheetCalls[sheetCalls.length - 1]
  check('la web manda el secret en cada llamada', call?.params?.secret === 'secreto-de-planilla', JSON.stringify(call?.params))
  check('hubo una llamada nueva', sheetCalls.length > antes)
  delete process.env.APPS_SCRIPT_SECRET
}

// ── Cierre ──────────────────────────────────────────────────────────────
// ── TEST 19 · MP manda el ts en SEGUNDOS, no en milisegundos ──
console.log('\n▶ TEST 19 · Timestamp del webhook en segundos (como lo manda MP)')
{
  const { verifyWebhookSignature } = await import('../lib/server/mercadopago.js')
  const crypto = await import('node:crypto')
  const secret = 'clave-de-prueba-1234567890'
  const id = '48489414707'

  // Mercado Pago usa segundos epoch. Date.now() usa milisegundos.
  const tsSegundos = Math.floor(Date.now() / 1000)
  const firma = 'ts=' + tsSegundos + ',v1=' + crypto.createHmac('sha256', secret)
    .update(`id:${id};request-id:req-mp;ts:${tsSegundos}`).digest('hex')

  check('ts en SEGUNDOS → firma válida (era el bug: daba "ts fuera de rango")',
    verifyWebhookSignature({ signature: firma, requestId: 'req-mp', dataId: id, secret }).ok)

  const tsMs = Date.now()
  const firmaMs = 'ts=' + tsMs + ',v1=' + crypto.createHmac('sha256', secret)
    .update(`id:${id};request-id:req-mp;ts:${tsMs}`).digest('hex')
  check('ts en MILISEGUNDOS → también válida',
    verifyWebhookSignature({ signature: firmaMs, requestId: 'req-mp', dataId: id, secret }).ok)

  const viejo = Math.floor(Date.now() / 1000) - 3600
  const firmaVieja = 'ts=' + viejo + ',v1=' + crypto.createHmac('sha256', secret)
    .update(`id:${id};request-id:req-mp;ts:${viejo}`).digest('hex')
  check('ts de hace 1 hora (en segundos) → rechazada',
    !verifyWebhookSignature({ signature: firmaVieja, requestId: 'req-mp', dataId: id, secret }).ok)
}

// ── TEST 20 · Firma sin request-id y con merchant_order ──
console.log('\n▶ TEST 20 · Variantes de firma que manda Mercado Pago')
{
  const { verifyWebhookSignature } = await import('../lib/server/mercadopago.js')
  const crypto = await import('node:crypto')
  const secret = 'clave-de-prueba-1234567890'
  const ts = Math.floor(Date.now() / 1000)
  const id = '48489414707'
  const hmac = (t) => crypto.createHmac('sha256', secret).update(t).digest('hex')

  // A · manifest normal, con request-id
  const conReq = `ts=${ts},v1=${hmac(`id:${id};request-id:req-x;ts:${ts}`)}`
  check('manifest con request-id (A) válido',
    verifyWebhookSignature({ signature: conReq, requestId: 'req-x', dataId: id, secret }).ok)

  // B · MP firma con request-id VACÍO aunque el header no venga
  const sinReq = `ts=${ts},v1=${hmac(`id:${id};request-id:;ts:${ts}`)}`
  const rB = verifyWebhookSignature({ signature: sinReq, requestId: undefined, dataId: id, secret })
  check('manifest con request-id vacío (B) válido', rB.ok, rB.reason)

  // C · manifest sin la parte del request-id
  const sinParte = `ts=${ts},v1=${hmac(`id:${id};ts:${ts}`)}`
  const rC = verifyWebhookSignature({ signature: sinParte, requestId: 'req-x', dataId: id, secret })
  check('manifest sin request-id (C) válido', rC.ok, rC.reason)

  // D · COMO LO DOCUMENTA MP: con punto y coma FINAL
  const conPunto = `ts=${ts},v1=${hmac(`id:${id};request-id:req-x;ts:${ts};`)}`
  const rD = verifyWebhookSignature({ signature: conPunto, requestId: 'req-x', dataId: id, secret })
  check('manifest CON ";" final (D, el de la doc de MP) válido', rD.ok, rD.reason)
  check('el manifest D se detecta como D', rD.manifest === 'D', String(rD.manifest))

  // E · con ";" final y sin request-id
  const conPuntoB = `ts=${ts},v1=${hmac(`id:${id};request-id:;ts:${ts};`)}`
  const rE = verifyWebhookSignature({ signature: conPuntoB, requestId: undefined, dataId: id, secret })
  check('manifest ";" final sin request-id (E) válido', rE.ok, rE.reason)

  // Sigue rechazando firmas de otro secreto
  const otra = `ts=${ts},v1=${hmac(`id:${id};request-id:;ts:${ts}`)}`.replace(/v1=[0-9a-f]/, 'v1=deadbeef')
  check('firma de otro secreto sigue rechazada (aunque haya 3 variantes)',
    !verifyWebhookSignature({ signature: otra, requestId: undefined, dataId: id, secret }).ok)

  // merchant_order se acepta como evento de pago
  const { default: handler } = await import('../lib/api/webhook-mercadopago.js')
  process.env.MP_WEBHOOK_SECRET = secret
  const mo = `ts=${ts},v1=${hmac(`id:${id};request-id:;ts:${ts}`)}`
  const res = await callHandler(handler, {
    method: 'POST',
    url: `/api/webhook-mercadopago?data.id=${id}&type=merchant_order`,
    headers: { 'x-signature': mo },
    body: { type: 'merchant_order', data: { id } },
  })
  check('merchant_order ya no se ignora, procesa la orden', res.status === 200 && !JSON.stringify(res.body).includes('ignored":"merchant_order'), JSON.stringify(res.body).slice(0, 120))

  // Se restaura el secreto de las demás pruebas (evita contaminar las siguientes).
  process.env.MP_WEBHOOK_SECRET = SECRET
}

// ── TEST 18 · Pago inexistente (simulación de MP) → 200, no 500 ──
console.log('\n▶ TEST 21 · Activación con la firma EXACTA de la doc de MP, llegando por merchant_order')
{
  // 1) Se crea el pedido y la preferencia, como hace un cliente real.
  await callHandler(invitations, {
    body: { action: 'create', invitation: { slug: 'mateo-7-velez', childName: 'Mateo', honoreeAge: 7, team: 'velez' }, plan: 'base' },
  })
  await callHandler(checkoutPreference, {
    body: { slug: 'mateo-7-velez', plan: 'base', baseUrl: 'https://app.example.com' },
  })

  // 2) El cliente paga: MP registra un pago APROBADO por 10.000.
  makePayment({ id: 1313131313, amount: 10000, reference: 'IF-mateo-7-velez-base' })
  merchantOrders.set('48489414707', {
    id: '48489414707',
    external_reference: 'IF-mateo-7-velez-base',
    payments: [{ id: 1313131313, status: 'approved' }],
  })

  // 3) MP avisa con la firma tal cual la documenta, ";" final incluido,
  //    y por el tópico merchant_order (que antes ignorábamos por completo).
  const ts = Math.floor(Date.now() / 1000)
  const id = '48489414707'
  const secretoActual = process.env.MP_WEBHOOK_SECRET
  const manifest = `id:${id};request-id:req-mo;ts:${ts};`
  const v1 = crypto.createHmac('sha256', secretoActual).update(manifest).digest('hex')
  const header = `ts=${ts},v1=${v1}`

  const result = await callHandler(webhook, {
    url: `/api/webhook-mercadopago?data.id=${id}&type=merchant_order`,
    body: { type: 'merchant_order', data: { id } },
    headers: { 'x-signature': header, 'x-request-id': 'req-mo' },
  })

  check('responde 200', result.status === 200, `${result.status} ${JSON.stringify(result.body)}`)
  check('activated = true', result.body.activated === true, JSON.stringify(result.body))
  check('el pedido quedó ACTIVA en la planilla', sheetOrders.get('mateo-7-velez').estado === 'ACTIVA', sheetOrders.get('mateo-7-velez').estado)
  check('guardó el id del PAGO, no el de la orden', sheetOrders.get('mateo-7-velez').payment_id === '1313131313', sheetOrders.get('mateo-7-velez').payment_id)
  check('quedó log de activación', sheetLogs.some((l) => l.resultado === 'activada' && l.order_id === 'IF-mateo-7-velez-base'))
}

console.log('\n▶ TEST 24 · Foto de portada: nunca rompe el pedido')
{
  const { default: invitations } = await import('../lib/api/invitations.js')

  // Una foto de celular sin comprimir ronda los 3 MB en base64: no entra en
  // una celda de Google Sheets (50.000 caracteres) y hacía fallar el guardado
  // del pedido entero. Ahora se descarta la foto, no el pedido.
  const gigante = 'data:image/jpeg;base64,' + 'A'.repeat(120000)
  const res = await callHandler(invitations, {
    body: {
      action: 'create',
      invitation: { slug: 'tomi-9-sanlorenzo', childName: 'Tomi', honoreeAge: 9, team: 'san-lorenzo', honoreePhoto: gigante },
      plan: 'base',
    },
  })
  check('el pedido se guarda igual', res.status === 201 && res.body.saved === true, `${res.status} ${JSON.stringify(res.body).slice(0, 120)}`)

  const chica = 'data:image/jpeg;base64,' + 'A'.repeat(30000)
  const res2 = await callHandler(invitations, {
    body: {
      action: 'create',
      invitation: { slug: 'cami-5-huracan', childName: 'Cami', honoreeAge: 5, team: 'huracan', honoreePhoto: chica },
      plan: 'base',
    },
  })
  const enviada = [...sheetCalls].reverse().find((c) => c.action === 'createInvitation' && c.params.slug === 'cami-5-huracan')
  check('una foto que entra en la celda sí se guarda', res2.status === 201 && String(enviada?.params?.foto_url || '').startsWith('data:image/jpeg;base64,AAAA'), String(enviada?.params?.foto_url?.length))
}

console.log('\n▶ TEST 22 · RSVP: el formulario manda "whatsapp" (no "phone")')
{
  const { default: rsvp } = await import('../lib/api/rsvp.js')
  const sheetRsvp = []

  // Antes la API leía solo body.phone y respondía "Faltan datos obligatorios"
  // aunque el formulario mandara todo. El formulario manda `whatsapp`.
  const ok = await callHandler(rsvp, {
    url: '/api/rsvp',
    body: { slug: 'gaby-25-boca-juniors', name: 'Abuela Marta', whatsapp: '3884123456', status: 'confirmed', guests: 1, notes: '¡Felicidades Thiago! Que cumplas muchos más ⚽' },
  })
  check('acepta el campo whatsapp sin devolver "Faltan datos"', ok.status === 201, `${ok.status} ${JSON.stringify(ok.body).slice(0, 120)}`)
  check('devuelve los mensajes de los invitados', Array.isArray(ok.body.messages), JSON.stringify(ok.body).slice(0, 120))

  const falta = await callHandler(rsvp, {
    url: '/api/rsvp',
    body: { slug: 'gaby-25-boca-juniors', name: 'Sin teléfono', status: 'confirmed' },
  })
  check('si falta el teléfono lo dice claro y nombra el campo', falta.status === 400 && /whatsapp/i.test(falta.body.error || ''), JSON.stringify(falta.body))
}

console.log('\n▶ TEST 23 · Pedido sin pagar: se comparte igual, sin filtrar la clave')
{
  const { default: invitations } = await import('../lib/api/invitations.js')

  // El pedido nace BORRADOR: debe poder verse en modo=compartir.
  await callHandler(invitations, {
    body: { action: 'create', invitation: { slug: 'lola-6-racing', childName: 'Lola', honoreeAge: 6, team: 'racing' }, plan: 'base' },
  })
  const creado = [...sheetOrders.values()].find((o) => o.slug === 'lola-6-racing')
  check('el pedido nace en BORRADOR (se puede compartir)', creado?.estado === 'BORRADOR', String(creado?.estado))

  const compartir = await callHandler(invitations, {
    method: 'GET',
    url: '/api/invitations?slug=lola-6-racing&modo=compartir',
  })
  check('modo=compartir devuelve la invitación sin pagar', Boolean(compartir.body?.borrador), JSON.stringify(compartir.body).slice(0, 120))
  check('no expone la clave del panel', !JSON.stringify(compartir.body).includes('clave'), JSON.stringify(compartir.body).slice(0, 120))

  const normal = await callHandler(invitations, { method: 'GET', url: '/api/invitations?slug=lola-6-racing' })
  check('sin modo=compartir un borrador no se publica (null)', normal.body === null, JSON.stringify(normal.body).slice(0, 80))
}

console.log('\n▶ TEST 18 · Simulación de notificación de Mercado Pago')
{
  // Mercado Pago, con el botón "Simular notificación", firma bien pero manda
  // un id inventado. La firma pasa y MP responde 404. Antes contestábamos 500,
  // el panel decía "la prueba de esta URL falló" y MP reintentaba cada 15 min.
  const { verifyWebhookSignature } = await import('../lib/server/mercadopago.js')
  const crypto = await import('node:crypto')
  const secret = 'clave-de-prueba-1234567890'
  const ts = Date.now()
  const id = '23425523'
  const signature = 'ts=' + ts + ',v1=' + crypto.createHmac('sha256', secret)
    .update(`id:${id};request-id:req-sim;ts:${ts}`).digest('hex')

  check('la simulación con firma válida pasa el primer control',
    verifyWebhookSignature({ signature, requestId: 'req-sim', dataId: id, secret }).ok)

  process.env.MP_WEBHOOK_SECRET = secret
  process.env.MP_ACCESS_TOKEN = 'token-falso-para-que-falle-la-lectura'

  const webhook = (await import('../lib/api/webhook-mercadopago.js')).default
  const res = await callHandler(webhook, {
    method: 'POST',
    url: '/api/webhook-mercadopago?data.id=' + id + '&type=payment',
    headers: { 'x-signature': signature, 'x-request-id': 'req-sim' },
    body: { type: 'payment', data: { id } },
  })

  check('no responde 500 (antes rompía la prueba del panel)', res.status !== 500, `status ${res.status}`)
  check('responde 200 con el motivo', res.status === 200, `status ${res.status}`)
  check('el motivo dice que el pago no existe',
    /inexistente|no_existe/i.test(JSON.stringify(res.body)), JSON.stringify(res.body).slice(0, 100))

  process.env.MP_WEBHOOK_SECRET = SECRET
}

// ── TEST 17 · Firma del webhook: id en minúsculas + secreto con comillas ──
console.log('\n▶ TEST 17 · Firma del webhook tal como la manda Mercado Pago')
{
  const { verifyWebhookSignature } = await import('../lib/server/mercadopago.js')
  const crypto = await import('node:crypto')

  const sign = (id, ts, secret, reqId = 'req-1') =>
    'ts=' + ts + ',v1=' + crypto.createHmac('sha256', secret)
      .update(`id:${String(id).toLowerCase()};request-id:${reqId};ts:${ts}`)
      .digest('hex')

  const ts = Date.now()
  const secret = 'clave-de-prueba-1234567890'

  // Mercado Pago manda el id en minúsculas en el manifest.
  check('id en minúsculas → firma válida',
    verifyWebhookSignature({ signature: sign('900006', ts, secret), requestId: 'req-1', dataId: '900006', secret }).ok)

  // Aunque el data.id llegue en mayúsculas, tiene que seguir validando.
  check('data.id en MAYÚSCULAS → también valida',
    verifyWebhookSignature({ signature: sign('900006', ts, secret), requestId: 'req-1', dataId: '900006'.toUpperCase(), secret }).ok)

  check('firma de otro secreto → rechazada',
    !verifyWebhookSignature({ signature: sign('900006', ts, 'otro-secreto'), requestId: 'req-1', dataId: '900006', secret }).ok)

  const viejo = Date.now() - 10 * 60 * 1000
  check('firma vieja (10 min) → rechazada',
    !verifyWebhookSignature({ signature: sign('900006', viejo, secret), requestId: 'req-1', dataId: '900006', secret }).ok)

  // El handler limpia comillas y espacios del secreto pegado en Vercel.
  const webhook = (await import('../lib/api/webhook-mercadopago.js')).default
  const res = await callHandler(webhook, { method: 'GET', url: '/api/webhook-mercadopago', headers: {} })
  check('GET /webhook-mercadopago responde diagnóstico', res.status === 200 && 'secretoConfigurado' in res.body, JSON.stringify(res.body).slice(0, 120))
  check('el diagnóstico NO expone el secreto', !JSON.stringify(res.body).includes('MP_WEBHOOK_SECRET') && !('webhookSecret' in res.body), JSON.stringify(res.body).slice(0, 120))
}

console.log(`\n${'─'.repeat(60)}`)
console.log(`RESULTADO: ${passed} pruebas OK · ${failed} fallas`)
console.log('─'.repeat(60))

mp.close()
fakeSheets.close()
process.exit(failed === 0 ? 0 : 1)
