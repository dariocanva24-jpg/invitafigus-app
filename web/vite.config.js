import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import router from './api/[...path].js'

// Las variables de las funciones serverless se cargan aquí solo para desarrollo local.
dotenv.config({ path: '.env.local' })
dotenv.config()

function vercelApiDev() {
  // En desarrollo, todo /api/* lo atiende el mismo router que en producción.
  // OJO: el middleware está montado en '/api', así que req.url llega SIN ese
  // prefijo (ej: '/teams?x=1'). Por eso se lo devolvemos antes de rutear.
  const middleware = (req, res, next) => {
    const original = req.url || '/'
    req.url = `/api${original.startsWith('/') ? '' : '/'}${original}`

    // Mismo formato que usa Vercel para el catch-all.
    const pathname = new URL(req.url, 'http://localhost').pathname
    req.query = {
      ...Object.fromEntries(new URL(req.url, 'http://localhost').searchParams),
      path: pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean),
    }

    Promise.resolve(router(req, res)).catch((error) => {
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
