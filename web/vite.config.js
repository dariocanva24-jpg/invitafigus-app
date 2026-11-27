import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import adminLogin from './api/admin-login.js'
import adminLogout from './api/admin-logout.js'
import adminProxy from './api/admin-proxy.js'
import invitations from './api/invitations.js'
import rsvp from './api/rsvp.js'
import payment from './api/payment.js'
import panel from './api/panel.js'

// Las variables de las funciones serverless se cargan aquí solo para desarrollo local.
dotenv.config({ path: '.env.local' })
dotenv.config()

const routes = [
  { path: '/admin-login', methods: ['GET', 'POST'], handler: adminLogin },
  { path: '/admin-logout', method: 'POST', handler: adminLogout },
  { path: '/admin-proxy', methods: ['GET', 'POST'], handler: adminProxy },
  { path: '/invitations', methods: ['GET', 'POST'], handler: invitations },
  { path: '/rsvp', methods: ['GET', 'POST'], handler: rsvp },
  { path: '/payment', method: 'POST', handler: payment },
  { path: '/panel', method: 'POST', handler: panel },
]

function vercelApiDev() {
  const middleware = (req, res, next) => {
    const pathname = new URL(req.url, 'http://localhost').pathname
    const route = routes.find((item) => item.path === pathname)
    if (!route) return next()
    if (route.method && req.method !== route.method) return next()
    if (route.methods && !route.methods.includes(req.method)) return next()

    Promise.resolve(route.handler(req, res)).catch((error) => {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: error.message }))
    })
  }

  return {
    name: 'vercel-api-dev',
    configureServer(server) { server.middlewares.use('/api', middleware) },
    configurePreviewServer(server) { server.middlewares.use('/api', middleware) },
  }
}

export default defineConfig({
  plugins: [react(), vercelApiDev()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false,
    allowedHosts: true,
  },
})
