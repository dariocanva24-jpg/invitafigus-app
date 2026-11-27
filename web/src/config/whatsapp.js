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

  // Pago: mensaje claro para el operador. name = nombre del homenajeado, slug = código de pedido
  payment: (name, slug) => chatUrl({
    intent: 'pago',
    detail: `Hola, ya pagué la invitación de ${name || 'mi hijo o hija'}. Código: ${slug || 'sin código'}. Te envío la foto por aquí.`,
  }),

  // No tiene Mercado Pago (o prefiere otro medio): se coordina el pago a mano.
  noMercadoPago: (name, slug, total) => chatUrl({
    intent: 'pago',
    detail: `Hola, quiero pagar la invitación de ${name || 'mi hijo o hija'} pero no tengo Mercado Pago. Código: ${slug || 'sin código'}${total ? `. Total: $${total}` : ''}. ¿Me pasás cómo pagar?`,
  }),

  // Comprobante cuando no tiene el número de operación
  paymentProof: (slug, paymentId) => chatUrl({
    intent: 'pago',
    detail: `Hola, pagué la invitación. Código: ${slug || 'sin código'}.${paymentId ? ` Nº de operación: ${paymentId}.` : ' No tengo el número de operación, te envío el comprobante.'} Te envío la foto por aquí.`,
  }),

  // Equipo personalizado: el usuario manda nombre + logo
  customTeam: (teamName, childName, slug) => chatUrl({
    intent: 'consulta',
    detail: `Quiero un equipo personalizado. Nombre del equipo: ${teamName || '[NOMBRE]'}. Homenajeado: ${childName || '?'}. Código: ${slug || 'sin código'}. Te envío el escudo o logo por aquí.`,
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
