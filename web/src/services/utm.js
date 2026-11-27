// Atribución: guarda los UTM de la URL en localStorage para que sobrevivan
// a la navegación interna (la landing puede redirigir a /crear sin los params).
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']

export function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search)
    KEYS.forEach((key) => {
      const value = params.get(key)
      if (value) localStorage.setItem(`if_${key}`, value.slice(0, 80))
    })
  } catch {
    // Sin localStorage (modo privado): no pasa nada, se pierde la atribución.
  }
}

export function readUtm() {
  const out = { source: '', medium: '', campaign: '', content: '' }
  try {
    out.source = localStorage.getItem('if_utm_source') || ''
    out.medium = localStorage.getItem('if_utm_medium') || ''
    out.campaign = localStorage.getItem('if_utm_campaign') || ''
    out.content = localStorage.getItem('if_utm_content') || ''
  } catch {
    // ignorar
  }
  return out
}
