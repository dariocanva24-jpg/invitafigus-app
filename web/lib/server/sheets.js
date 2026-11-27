const READ_ACTIONS = new Set(['getAll', 'getBySlug', 'rsvpCount', 'getRSVPs', 'panelIssue', 'panelSummary', 'getTeams', 'getOrder', 'getAudit'])
const WRITE_ACTIONS = new Set(['updateStatus', 'deleteRow', 'updateField', 'incrementViews', 'createInvitation', 'addRSVP', 'issuePanelKey', 'addTeam', 'removeTeam', 'setPreference', 'activateOrder', 'deactivateOrder', 'logWebhook', 'setConsent'])

function scriptUrl() {
  if (!process.env.APPS_SCRIPT_URL) {
    throw new Error('APPS_SCRIPT_URL no configurada en el servidor')
  }
  return process.env.APPS_SCRIPT_URL
}

// Secreto compartido con Apps Script. Si no está configurado, la planilla
// acepta todo (modo transición) pero la web avisa en los logs.
let warnedNoSecret = false

function scriptSecret() {
  const secret = process.env.APPS_SCRIPT_SECRET || ''
  if (!secret && !warnedNoSecret) {
    warnedNoSecret = true
    console.warn('[sheets] AVISO: APPS_SCRIPT_SECRET vacío. La planilla no valida el origen.')
  }
  return secret
}

async function withTimeout(signalFn) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    return await signalFn(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

export async function readFromSheets(action, params = {}) {
  if (!READ_ACTIONS.has(action)) throw new Error('Acción de lectura no permitida')
  const url = new URL(scriptUrl())
  url.searchParams.set('action', action)
  const secret = scriptSecret()
  if (secret) url.searchParams.set('secret', secret)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  })
  const response = await withTimeout((signal) => fetch(url, { signal, redirect: 'follow' }))
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Error al leer Google Sheets')
  return data.data
}

export async function writeToSheets(action, params = {}) {
  if (!WRITE_ACTIONS.has(action)) throw new Error('Acción de escritura no permitida')
  const body = new URLSearchParams()
  const secret = scriptSecret()
  if (secret) body.set('secret', secret)
  Object.entries(params).forEach(([key, value]) => {
    body.set(key, value === undefined || value === null ? '' : String(value))
  })
  const response = await withTimeout((signal) => fetch(`${scriptUrl()}?action=${action}`, {
    method: 'POST',
    redirect: 'follow',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal,
  }))
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Error al escribir en Google Sheets')
  return data
}

// Igual que writeToSheets pero reintenta si la planilla estaba ocupada
// (LockService no consiguió el turno). Lo usan las activaciones de pago,
// donde perder la escritura significa un cliente que pagó y no tiene link.
export async function writeToSheetsWithRetry(action, params = {}, attempts = 3) {
  let lastError = null
  for (let i = 0; i < attempts; i++) {
    try {
      return await writeToSheets(action, params)
    } catch (error) {
      lastError = error
      const busy = /ocupada|intentá|try again|Service Spreadsheets/i.test(error.message)
      if (!busy) throw error
      await new Promise((resolve) => setTimeout(resolve, 800 * (i + 1)))
    }
  }
  throw lastError
}

export { READ_ACTIONS, WRITE_ACTIONS }
