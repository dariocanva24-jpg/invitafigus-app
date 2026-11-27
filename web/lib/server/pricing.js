// Precios en un solo lugar. NUNCA duplicar cifras en el código.
// El servidor es la única fuente de verdad: el cliente no puede mandar el monto.
export const PRICE_BASE = 10000
export const PRICE_COMPLETE = 14999
export const BUMP_ADD = PRICE_COMPLETE - PRICE_BASE // 4.999

export const ALLOWED_AMOUNTS = [PRICE_BASE, PRICE_COMPLETE]

export const PLANS = {
  base: {
    id: 'base',
    title: 'Invitación InvitaFigus',
    description: 'Figurita digital con contador, mapa y confirmación de asistencia.',
    amount: PRICE_BASE,
  },
  completo: {
    id: 'completo',
    title: 'Cumple Completo',
    description: 'Invitación + lista de asistentes exportable + PDF para imprimir + segundo diseño + cambio de fecha sin costo.',
    amount: PRICE_COMPLETE,
  },
}

// Devuelve el monto REAL a cobrar. Cualquier valor raro cae al plan base.
export function amountForPlan(plan) {
  return plan === 'completo' ? PRICE_COMPLETE : PRICE_BASE
}

export function planForAmount(amount) {
  const value = Number(amount)
  if (value === PRICE_COMPLETE) return 'completo'
  if (value === PRICE_BASE) return 'base'
  return null
}

export function isAllowedAmount(amount) {
  return ALLOWED_AMOUNTS.includes(Number(amount))
}
