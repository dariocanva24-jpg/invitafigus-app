// ============================================
// CLIENTE API — todas las llamadas pasan por funciones serverless.
// La URL de Google Apps Script y las credenciales viven solo en el servidor.
// ============================================

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  })

  let data
  try { data = await response.json() } catch { data = {} }

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`)
  }
  return data
}

export async function fetchAllInvitations() {
  // Requiere cookie de admin; la validación ocurre en /api/admin-proxy.
  return request('/api/admin-proxy?action=getAll')
}

export async function fetchInvitationBySlug(slug) {
  return request(`/api/invitations?slug=${encodeURIComponent(slug)}`)
}

export async function activateInvitationRemote(rowIndex) {
  return request('/api/admin-proxy', {
    method: 'POST',
    body: JSON.stringify({ action: 'updateStatus', rowIndex, estado: 'ACTIVA' }),
  })
}

export async function deleteInvitationRemote(rowIndex) {
  return request('/api/admin-proxy', {
    method: 'POST',
    body: JSON.stringify({ action: 'deleteRow', rowIndex }),
  })
}

export async function updateInvitationField(rowIndex, field, value) {
  return request('/api/admin-proxy', {
    method: 'POST',
    body: JSON.stringify({ action: 'updateField', rowIndex, field, value: value || '' }),
  })
}

export async function incrementViewsRemote(slug) {
  const data = await request('/api/invitations', {
    method: 'POST',
    body: JSON.stringify({ action: 'incrementViews', slug }),
  })
  return data.views
}
