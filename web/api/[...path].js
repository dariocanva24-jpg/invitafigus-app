// ───────────────────────────────────────────────────────────────────────────
// ÚNICA función serverless del proyecto.
//
// El plan Hobby de Vercel permite hasta 12 funciones por deployment, y cada
// archivo dentro de api/ cuenta como una. Teníamos 12 exactas y la Fase 2
// la pasó de largo (el build fallaba con "No more than 12 Serverless
// Functions"). Con este router hay UNA sola función, sin importar cuántos
// endpoints agreguemos después.
//
// Las URLs públicas NO cambian: /api/rsvp, /api/panel, /api/webhook/mercadopago
// y el resto siguen funcionando igual.
// ───────────────────────────────────────────────────────────────────────────

import adminAudit from '../lib/api/admin-audit.js'
import adminLogin from '../lib/api/admin-login.js'
import adminLogout from '../lib/api/admin-logout.js'
import adminProxy from '../lib/api/admin-proxy.js'
import checkoutPreference from '../lib/api/checkout-preference.js'
import consent from '../lib/api/consent.js'
import invitations from '../lib/api/invitations.js'
import order from '../lib/api/order.js'
import panel from '../lib/api/panel.js'
import rsvp from '../lib/api/rsvp.js'
import teams from '../lib/api/teams.js'
import webhookMercadopago from '../lib/api/webhook-mercadopago.js'

// ruta exacta (sin /api y sin barra final) → handler
const ROUTES = {
  'admin-login': adminLogin,
  'admin-logout': adminLogout,
  'admin-proxy': adminProxy,
  'admin-audit': adminAudit,
  'invitations': invitations,
  'rsvp': rsvp,
  'teams': teams,
  'order': order,
  'consent': consent,
  'panel': panel,
  // Rutas anidadas: Vercel NO las entrega al catch-all (las manda al CDN y
  // devuelve 404), así que además se registran con guion. Son las URLs que usa
  // la app y las que se configuran en Mercado Pago.
  'checkout-preference': checkoutPreference,
  'webhook-mercadopago': webhookMercadopago,
}

// Alias viejos con barra: por si alguna preferencia ya creada en Mercado Pago
// apunta ahí. No se listan entre las rutas oficiales.
const LEGACY_ROUTES = {
  'checkout/preference': checkoutPreference,
  'webhook/mercadopago': webhookMercadopago,
}

function resolveRoute(req) {
  // Vercel manda la ruta en req.query.path (catch-all) o en la URL.
  const fromQuery = req.query?.path
  const segments = Array.isArray(fromQuery)
    ? fromQuery
    : fromQuery
      ? String(fromQuery).split('/')
      : new URL(req.url, 'http://localhost').pathname.replace(/^\/api\/?/, '').split('/')

  return segments
    .map((part) => decodeURIComponent(part || '').trim())
    .filter(Boolean)
    .join('/')
}

export default function handler(req, res) {
  const route = resolveRoute(req)
  const target = ROUTES[route] || LEGACY_ROUTES[route]

  if (!target) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({
      error: 'Ruta de API desconocida',
      route,
      disponibles: Object.keys(ROUTES),
    }))
    return
  }

  return target(req, res)
}
