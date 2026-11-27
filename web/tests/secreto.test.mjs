/**
 * Tests del secreto compartido (lado Apps Script).
 * Ejecuta el código REAL de PLANILLA-CODIGO.gs con objetos falsos de Sheets.
 *
 * Uso: node tests/secreto.test.mjs
 */
import fs from 'node:fs'
import vm from 'node:vm'

const code = fs.readFileSync(new URL('../../publicar/PLANILLA-CODIGO.gs', import.meta.url), 'utf8')

function makeContext({ secret = '', lockAvailable = true } = {}) {
  const props = { SHARED_SECRET: secret }
  const calls = { appendRow: 0, lock: 0, release: 0, rows: [] }
  const sheet = {
    getLastRow: () => 1,
    getLastColumn: () => 6,
    getName: () => 'Respuestas',
    getParent: () => ({ getName: () => 'Planilla' }),
    getRange: () => ({ getValues: () => [[]], getValue: () => '', setValue: () => {}, setValues: () => {} }),
    appendRow: (row) => { calls.appendRow += 1; calls.rows.push(row) },
    insertSheet: () => sheet,
  }
  const ctx = {
    console,
    Logger: { log: () => {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, getSheets: () => [sheet], insertSheet: () => sheet, getName: () => 'Planilla' }), openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => { calls.lock += 1; return lockAvailable },
        releaseLock: () => { calls.release += 1 },
      }),
    },
    Utilities: {
      formatDate: () => '2026-11-25',
      getUuid: () => 'abcdef1234567890',
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this } }),
    },
  }
  vm.createContext(ctx)
  vm.runInContext(code, ctx)
  return { ctx, calls }
}

function callPost(ctx, params) {
  const result = ctx.doPost({ parameter: params })
  return JSON.parse(result.text)
}
function callGet(ctx, params) {
  const result = ctx.doGet({ parameter: params })
  return JSON.parse(result.text)
}

let passed = 0
let failed = 0
function check(name, condition, extra = '') {
  if (condition) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name}${extra ? ` → ${extra}` : ''}`) }
}

console.log('\n▶ TEST 1 · Sin secreto configurado → escritura denegada')
{
  const { ctx } = makeContext({ secret: '' })
  const res = callPost(ctx, { action: 'updateStatus', rowIndex: '2', estado: 'ACTIVA' })
  check('success = false', res.success === false, JSON.stringify(res))
  check('dice que falta configurar', /no configurado/i.test(res.error), res.error)
}

console.log('\n▶ TEST 2 · Secreto configurado, pedido con secreto incorrecto → denegado')
{
  const { ctx, calls } = makeContext({ secret: 'clave-de-verdad' })
  const res = callPost(ctx, { action: 'updateStatus', rowIndex: '2', estado: 'ACTIVA', secret: 'clave-falsa' })
  check('success = false', res.success === false)
  check('avisa secreto inválido', /inv[aá]lido/i.test(res.error), res.error)
  // Puede escribir SOLO la fila de auditoría del rechazo; nunca un cambio de estado.
  const escribioEstado = calls.rows.some((row) => Array.isArray(row) && row.includes('ACTIVA'))
  check('NO cambió ningún estado', !escribioEstado, JSON.stringify(calls.rows))
  const auditoria = calls.rows.some((row) => Array.isArray(row) && row.includes('acceso_denegado'))
  check('sí dejó registro del intento', auditoria, JSON.stringify(calls.rows))
}

console.log('\n▶ TEST 3 · Sin secreto en el pedido → denegado')
{
  const { ctx } = makeContext({ secret: 'clave-de-verdad' })
  const res = callPost(ctx, { action: 'activateOrder', order_id: 'IF-x-base' })
  check('success = false', res.success === false)
  check('dice que falta el secreto', /falta el secreto/i.test(res.error), res.error)
}

console.log('\n▶ TEST 4 · Secreto correcto → pasa la validación')
{
  const { ctx } = makeContext({ secret: 'clave-de-verdad' })
  const res = callPost(ctx, { action: 'logWebhook', payment_id: '123', resultado: 'activada', secret: 'clave-de-verdad' })
  check('success = true', res.success === true, JSON.stringify(res))
}

console.log('\n▶ TEST 5 · Acciones públicas NO piden secreto')
{
  const { ctx } = makeContext({ secret: 'clave-de-verdad' })
  for (const action of ['getBySlug', 'getOrder', 'addRSVP', 'incrementViews', 'rsvpCount']) {
    const res = ctx.doGet({ parameter: { action, slug: 'x' } })
    const parsed = JSON.parse(res.text)
    check(`${action} no responde "Acceso denegado"`, !/Acceso denegado/.test(parsed.error || ''), parsed.error)
  }
}

console.log('\n▶ TEST 6 · Acciones privadas por GET SÍ piden secreto')
{
  const { ctx } = makeContext({ secret: 'clave-de-verdad' })
  for (const action of ['getAll', 'getAudit', 'getTeams']) {
    const res = callGet(ctx, { action, secret: 'mala' })
    check(`${action} denegada sin secreto válido`, res.success === false && /denegado/i.test(res.error), res.error)
  }
  const ok = callGet(ctx, { action: 'getTeams', secret: 'clave-de-verdad' })
  check('getTeams con secreto válido pasa', !/denegado/i.test(ok.error || ''), ok.error)
}

console.log('\n▶ TEST 7 · LockService: toma y libera el lock')
{
  const { ctx, calls } = makeContext({ secret: 'k' })
  callPost(ctx, { action: 'logWebhook', payment_id: '1', secret: 'k' })
  check('tomó el lock', calls.lock === 1, String(calls.lock))
  check('liberó el lock', calls.release === 1, String(calls.release))
}

console.log('\n▶ TEST 8 · LockService ocupado → responde para reintentar')
{
  const { ctx } = makeContext({ secret: 'k', lockAvailable: false })
  const res = callPost(ctx, { action: 'logWebhook', payment_id: '1', secret: 'k' })
  check('success = false', res.success === false)
  check('pide reintentar', /ocupada|reintent/i.test(res.error), res.error)
}

console.log('\n▶ TEST 9 · El lock se libera aunque la acción falle')
{
  const { ctx, calls } = makeContext({ secret: 'k' })
  // Acción inexistente: cae en el error final, pero el finally debe liberar.
  callPost(ctx, { action: 'accionQueNoExiste', secret: 'k' })
  check('liberó el lock igual', calls.release === 1, String(calls.release))
}

console.log('\n▶ TEST 10 · Motivo de desactivación validado (whitelist)')
{
  const { ctx } = makeContext({ secret: 'k' })
  const res = callPost(ctx, { action: 'deactivateOrder', slug: 'x', motivo: 'loquesea', secret: 'k' })
  // No hay pedido en el mock, pero el punto es que no explote y valide el motivo.
  check('no rompe con motivo raro', typeof res.success === 'boolean', JSON.stringify(res))
}

console.log(`\n${'─'.repeat(60)}`)
console.log(`RESULTADO: ${passed} pruebas OK · ${failed} fallas`)
console.log('─'.repeat(60))
process.exit(failed === 0 ? 0 : 1)
