// Punto de entrada para Vercel (@vercel/node): monta la app Express y asegura
// las tablas una sola vez por instancia.
const app = require('./server')

let ready = null

module.exports = async (req, res) => {
  if (!ready) {
    ready = app.initStores().catch((error) => {
      console.error('initStores:', error.message)
      ready = null
    })
  }
  await ready
  return app(req, res)
}
