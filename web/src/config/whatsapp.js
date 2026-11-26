// Un solo lugar para todos los enlaces de WhatsApp del operador.
// El prefijo identifica el producto y la intención para que el operador
// pueda separar los mensajes de InvitaFigus de otros productos digitales.

export const PRODUCT = 'InvitaFigus'
export const OPERATOR_NUMBER = '5493885212331'

const digits = (phone) => String(phone || '').replace(/\D/g, '')

export function chatUrl({ intent, detail = '', phone = OPERATOR_NUMBER }) {
  const tag = `[${PRODUCT} · ${intent.toUpperCase()}]`
  const text = detail ? `${tag}\n${detail}` : tag
  return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`
}

export const whatsappLinks = {
  support: () => chatUrl({ intent: 'consulta', detail: 'Hola, necesito ayuda con una invitación.' }),

  payment: (name, slug) => chatUrl({
    intent: 'pago',
    detail: `Ya pagué la invitación de ${name || '?'}. Código: ${slug || '?'}. Envío la foto por aquí.`,
  }),

  rsvp: ({ name, slug, guests, status, phone }) => chatUrl({
    intent: 'rsvp',
    phone: phone || OPERATOR_NUMBER,
    detail: `${name} ${status === 'confirmed' ? 'confirmó su asistencia' : 'no podrá asistir'}. Acompañantes: ${guests || 0}. Código: ${slug || '?'}.`,
  }),

  delivery: (invitation, link) => chatUrl({
    intent: 'entrega',
    phone: invitation?.telefono || OPERATOR_NUMBER,
    detail: `Tu invitación de InvitaFigus está lista: ${invitation?.nombre || '?'} (${invitation?.slug || '?'}). Link: ${link}`,
  }),

  missing: () => chatUrl({ intent: 'consulta', detail: 'No encuentro mi invitación, ¿me ayudan?' }),
}
