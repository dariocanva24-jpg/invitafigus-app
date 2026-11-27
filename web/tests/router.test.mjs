/**
 * Verifica que la UNICA funcion serverless resuelva bien todas las rutas.
 * (El plan Hobby de Vercel admite 12 funciones; con el router hay 1 sola.)
 *
 * Uso: node tests/router.test.mjs
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

let passed = 0
let failed = 0
function check(name, condition, extra = '') {
  if (condition) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name}${extra ? ` → ${extra}` : ''}`) }
}

// ── 1. Conteo de funciones serverless ───────────────────────────────────
console.log('\n▶ TEST 1 · Cantidad de funciones serverless (límite Hobby = 12)')
{
  const apiFiles = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) apiFiles.push(full)
    }
  }
  if (fs.existsSync('api')) walk('api')

  check(`solo hay 1 archivo en api/ (hay ${apiFiles.length})`, apiFiles.length === 1, apiFiles.join(', '))
  check('ese archivo es el router catch-all', apiFiles[0]?.includes('[...path]'), apiFiles[0])
  check('Quedan 11 funciones de margen', apiFiles.length <= 12, String(apiFiles.length))
}

// ── 2. El router resuelve las 12 rutas ──────────────────────────────────
console.log('\n▶ TEST 2 · El router conoce las 12 rutas')
{
  const source = fs.readFileSync('api/[...path].js', 'utf8')
  const rutas = [
    'admin-login', 'admin-logout', 'admin-proxy', 'admin-audit',
    'invitations', 'rsvp', 'teams', 'order', 'consent', 'panel',
    'checkout-preference', 'webhook-mercadopago',
  ]
  rutas.forEach((ruta) => {
    check(`ruta "${ruta}" registrada`, source.includes(`'${ruta}'`), 'no aparece en ROUTES')
  })
}

// ── 3. Resolución de rutas (query y URL) ────────────────────────────────
console.log('\n▶ TEST 3 · Resolución de la ruta (parámetros y URL)')
{
  const handler = (await import('../api/[...path].js')).default

  const call = (req) => new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v },
      end(payload) { let json = {}; try { json = JSON.parse(payload) } catch {}; resolve({ status: this.statusCode, body: json }) },
    }
    handler(req, res)
  })

  // Ruta desconocida → 404 con la lista de disponibles
  const unknown = await call({ method: 'GET', url: '/api/no-existe', query: { path: ['no-existe'] }, headers: {} })
  check('ruta desconocida → 404', unknown.status === 404, String(unknown.status))
  check('el 404 lista las 12 rutas válidas', Array.isArray(unknown.body.disponibles) && unknown.body.disponibles.length === 12, String(unknown.body.disponibles?.length))
  check('las rutas oficiales no llevan barra', Array.isArray(unknown.body.disponibles) && unknown.body.disponibles.every((r) => !r.includes('/')), JSON.stringify(unknown.body.disponibles))

  // Ruta válida resuelta desde la URL (sin req.query, como en local)
  const fromUrl = await call({ method: 'GET', url: '/api/teams', headers: {} })
  check('resuelve desde la URL', fromUrl.status !== 404, `${fromUrl.status} ${JSON.stringify(fromUrl.body).slice(0, 80)}`)

  // Ruta anidada
  // Las rutas de pago van con GUION: Vercel nunca entrega rutas anidadas al
  // catch-all (las resuelve el CDN y devuelve 404).
  const checkout = await call({ method: 'POST', url: '/api/checkout-preference', query: { path: ['checkout-preference'] }, headers: {}, body: {} })
  check('resuelve checkout-preference', checkout.status !== 404, String(checkout.status))
  const webhook = await call({ method: 'POST', url: '/api/webhook-mercadopago', query: { path: ['webhook-mercadopago'] }, headers: {}, body: {} })
  check('resuelve webhook-mercadopago', webhook.status !== 404, String(webhook.status))

  // Y no debe quedar ninguna ruta con barra en lo que usa la app/MP.
  const prefSource = fs.readFileSync('lib/server/mercadopago.js', 'utf8')
  check('la notification_url usa guion (sin barra)', prefSource.includes('/api/webhook-mercadopago'), 'quedó /api/webhook/mercadopago')
  const pageSource = fs.readFileSync('src/pages/CreatePage.jsx', 'utf8')
  check('la web llama a /api/checkout-preference', pageSource.includes('/api/checkout-preference'), 'quedó /api/checkout/preference')

  // Cualquier método llega al handler (el que decide es cada endpoint)
  const wrongMethod = await call({ method: 'DELETE', url: '/api/rsvp', query: { path: ['rsvp'] }, headers: {} })
  check('método no soportado lo rechaza el endpoint, no el router', wrongMethod.status !== 404, String(wrongMethod.status))
}

// ── 4. Nada quedó importando rutas viejas ───────────────────────────────
console.log('\n▶ TEST 4 · No quedan referencias a las rutas viejas')
{
  const offenders = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(js|jsx|mjs)$/.test(entry.name)) {
        const text = fs.readFileSync(full, 'utf8')
        // El router y vite.config.js son los únicos que pueden tocar api/
        const permitido = full.includes('[...path]') || full.endsWith('vite.config.js')
        if (!permitido && /from '\.\.?\/api\//.test(text)) offenders.push(full)
      }
    }
  }
  walk('.')
  check('ningún archivo importa desde api/ (salvo el router)', offenders.length === 0, offenders.join(', '))
}

console.log(`\n${'─'.repeat(60)}`)
console.log(`RESULTADO: ${passed} pruebas OK · ${failed} fallas`)
console.log('─'.repeat(60))
process.exit(failed === 0 ? 0 : 1)
