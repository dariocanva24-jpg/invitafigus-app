import { readJson, sendJson } from '../lib/server/auth.js'

const apiUrl = () => process.env.API_BASE_URL || ''
const apiToken = () => process.env.API_TOKEN || ''

async function callApi(path, options = {}) {
  if (!apiUrl() || !apiToken()) throw new Error('API_BASE_URL / API_TOKEN no configurados en el servidor')
  const response = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiToken() },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`)
  return data
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' })
    const body = await readJson(req)
    const { action } = body
    if (action === 'start') {
      const code = String(body.code || '')
      if (!/^[a-z0-9-]{3,120}$/i.test(code)) return sendJson(res, 400, { error: 'Código inválido' })
      const data = await callApi('/api/payments/start', {
        method: 'POST', body: JSON.stringify({ code, amount: 10000 }),
      })
      return sendJson(res, 201, data)
    }
    if (action === 'create') {
      const code = String(body.code || '')
      const baseUrl = String(body.baseUrl || '')
      if (!/^[a-z0-9-]{3,120}$/i.test(code)) return sendJson(res, 400, { error: 'Código inválido' })
      try {
        const data = await callApi('/api/payments/create', {
          method: 'POST',
          body: JSON.stringify({ code, amount: 10000, baseUrl: baseUrl || undefined }),
        })
        return sendJson(res, 201, data)
      } catch (error) {
        // Sin token de MP configurado: el frontend usa el link de pago estático.
        console.error('payment create:', error.message)
        return sendJson(res, 200, { status: 'unconfigured' })
      }
    }
    if (action === 'verify') {
      const code = String(body.code || '')
      const paymentId = String(body.paymentId || '')
      if (!/^[a-z0-9-]{3,120}$/i.test(code) || !/^\d{5,20}$/.test(paymentId)) {
        return sendJson(res, 400, { error: 'Datos inválidos' })
      }
      const data = await callApi('/api/payments/verify', {
        method: 'POST', body: JSON.stringify({ code, paymentId }),
      })
      return sendJson(res, 200, data)
    }
    if (action === 'status') {
      const code = String(body.code || '')
      if (!/^[a-z0-9-]{3,120}$/i.test(code)) return sendJson(res, 400, { error: 'Código inválido' })
      return sendJson(res, 200, await callApi(`/api/payments/status?code=${encodeURIComponent(code)}`))
    }
    return sendJson(res, 400, { error: 'Acción desconocida' })
  } catch (error) {
    console.error('payment proxy:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
