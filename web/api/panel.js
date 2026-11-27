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
    const code = String(body.code || '')
    if (!/^[a-z0-9-]{3,120}$/i.test(code)) return sendJson(res, 400, { error: 'Código inválido' })

    if (action === 'issue') {
      return sendJson(res, 201, await callApi('/api/panels/issue', {
        method: 'POST', body: JSON.stringify({ code }),
      }))
    }
    if (action === 'summary') {
      const key = String(body.key || '')
      if (!key) return sendJson(res, 400, { error: 'Falta la clave del panel' })
      return sendJson(res, 200, await callApi('/api/panels/summary', {
        method: 'POST', body: JSON.stringify({ code, key }),
      }))
    }
    return sendJson(res, 400, { error: 'Acción desconocida' })
  } catch (error) {
    console.error('panel proxy:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
