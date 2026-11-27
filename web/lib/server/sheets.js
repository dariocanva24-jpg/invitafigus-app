const READ_ACTIONS = new Set(['getAll', 'getBySlug', 'rsvpCount', 'getRSVPs', 'panelIssue', 'panelSummary', 'getTeams'])
const WRITE_ACTIONS = new Set(['updateStatus', 'deleteRow', 'updateField', 'incrementViews', 'createInvitation', 'addRSVP', 'issuePanelKey', 'addTeam', 'removeTeam'])

function scriptUrl() {
  if (!process.env.APPS_SCRIPT_URL) {
    throw new Error('APPS_SCRIPT_URL no configurada en el servidor')
  }
  return process.env.APPS_SCRIPT_URL
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

export { READ_ACTIONS, WRITE_ACTIONS }
