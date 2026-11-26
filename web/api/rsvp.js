import { readJson, sendJson } from '../lib/server/auth.js'

const apiUrl = () => process.env.API_BASE_URL || ''
const apiToken = () => process.env.API_TOKEN || ''

async function callApi(path, options = {}) {
  if (!apiUrl() || !apiToken()) {
    throw new Error('API_BASE_URL / API_TOKEN no configurados en el servidor')
  }
  const response = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiToken(),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`)
  return data
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const slug = new URL(req.url, 'http://localhost').searchParams.get('slug') || ''
      if (!/^[a-z0-9-]{1,120}$/i.test(slug)) return sendJson(res, 400, { error: 'Slug inválido' })
      const count = await callApi(`/api/rsvps/count?slug=${encodeURIComponent(slug)}`)
      return sendJson(res, 200, { ok: true, count })
    }

    if (req.method === 'POST') {
      const body = await readJson(req)
      const { slug, name, phone, status, guests, notes } = body
      if (!slug || !name || !phone || !status) {
        return sendJson(res, 400, { error: 'Faltan datos obligatorios' })
      }
      const data = await callApi('/api/rsvps', {
        method: 'POST',
        body: JSON.stringify({ slug, name, phone, status, guests, notes }),
      })
      return sendJson(res, 201, { ok: true, rsvp: data.rsvp, notified: Boolean(data.notified) })
    }

    return sendJson(res, 405, { error: 'Método no permitido' })
  } catch (error) {
    console.error('rsvp proxy:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
