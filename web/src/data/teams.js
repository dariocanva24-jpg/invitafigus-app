// Fuente única de equipos: la usan HomePage, CreatePage, PlayerCard y TeamSelector.
// Los escudos nuevos son ilustraciones SVG originales (no logos oficiales).

export const teams = [
  { id: 'argentina', name: 'Argentina', shortName: 'ARG', shield: '/escudos/argentina.svg', colors: { primary: '#6CACE4', secondary: '#FFD700', text: '#1a1a3e' }, category: 'seleccion' },
  { id: 'brazil', name: 'Brasil', shortName: 'BRA', shield: '/escudos/brazil.svg', colors: { primary: '#009739', secondary: '#FFD700', text: '#ffffff' }, category: 'seleccion' },
  { id: 'mexico', name: 'México', shortName: 'MEX', shield: '/escudos/mexico.svg', colors: { primary: '#00843D', secondary: '#C8102E', text: '#ffffff' }, category: 'seleccion' },
  { id: 'uruguay', name: 'Uruguay', shortName: 'URU', shield: '/escudos/uruguay.svg', colors: { primary: '#0B3D91', secondary: '#ffffff', text: '#ffffff' }, category: 'seleccion' },
  { id: 'colombia', name: 'Colombia', shortName: 'COL', shield: '/escudos/colombia.svg', colors: { primary: '#F7D417', secondary: '#0B3D91', text: '#0B3D91' }, category: 'seleccion' },
  { id: 'portugal', name: 'Portugal', shortName: 'POR', shield: '/escudos/portugal.svg', colors: { primary: '#00843D', secondary: '#C8102E', text: '#ffffff' }, category: 'seleccion' },
  { id: 'espana', name: 'España', shortName: 'ESP', shield: '/escudos/espana.svg', colors: { primary: '#C8102E', secondary: '#F7D417', text: '#ffffff' }, category: 'seleccion' },
  { id: 'francia', name: 'Francia', shortName: 'FRA', shield: '/escudos/francia.svg', colors: { primary: '#0B3D91', secondary: '#ffffff', text: '#ffffff' }, category: 'seleccion' },

  { id: 'boca', name: 'Boca Juniors', shortName: 'CABJ', shield: '/escudos/boca.svg', colors: { primary: '#1B4F9C', secondary: '#FFD700', text: '#ffffff' }, category: 'argentina' },
  { id: 'river', name: 'River Plate', shortName: 'CARP', shield: '/escudos/river.svg', colors: { primary: '#D42A2A', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'sanlorenzo', name: 'San Lorenzo', shortName: 'CASLA', shield: '/escudos/sanlorenzo.svg', colors: { primary: '#1B4F9C', secondary: '#E31E24', text: '#ffffff' }, category: 'argentina' },
  { id: 'racing', name: 'Racing Club', shortName: 'RACING', shield: '/escudos/racing.svg', colors: { primary: '#1E90FF', secondary: '#ffffff', text: '#1a1a3e' }, category: 'argentina' },
  { id: 'independiente', name: 'Independiente', shortName: 'CAI', shield: '/escudos/independiente.svg', colors: { primary: '#E31E24', secondary: '#111111', text: '#ffffff' }, category: 'argentina' },
  { id: 'newells', name: "Newell's Old Boys", shortName: 'NOB', shield: '/escudos/newells.svg', colors: { primary: '#C8102E', secondary: '#111111', text: '#ffffff' }, category: 'argentina' },
  { id: 'rosariocentral', name: 'Rosario Central', shortName: 'CAN', shield: '/escudos/rosariocentral.svg', colors: { primary: '#F7D417', secondary: '#1B4F9C', text: '#1B4F9C' }, category: 'argentina' },
  { id: 'velez', name: 'Vélez Sarsfield', shortName: 'VELEZ', shield: '/escudos/velez.svg', colors: { primary: '#0B3D91', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'huracan', name: 'Huracán', shortName: 'HUR', shield: '/escudos/huracan.svg', colors: { primary: '#E31E24', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'lanus', name: 'Lanús', shortName: 'LAN', shield: '/escudos/lanus.svg', colors: { primary: '#6B2D8F', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'estudiantes', name: 'Estudiantes de La Plata', shortName: 'EDLP', shield: '/escudos/estudiantes.svg', colors: { primary: '#C8102E', secondary: '#111111', text: '#ffffff' }, category: 'argentina' },
  { id: 'godoycruz', name: 'Godoy Cruz', shortName: 'GC', shield: '/escudos/godoycruz.svg', colors: { primary: '#1E5AA8', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'talleres', name: 'Talleres de Córdoba', shortName: 'TAL', shield: '/escudos/talleres.svg', colors: { primary: '#1E5AA8', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'gimnasialp', name: 'Gimnasia La Plata', shortName: 'GLP', shield: '/escudos/gimnasialp.svg', colors: { primary: '#0B3D91', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'union', name: 'Unión de Santa Fe', shortName: 'USF', shield: '/escudos/union.svg', colors: { primary: '#C8102E', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'atleticotucuman', name: 'Atlético Tucumán', shortName: 'CAT', shield: '/escudos/atleticotucuman.svg', colors: { primary: '#1E5AA8', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'defensa', name: 'Defensa y Justicia', shortName: 'DYJ', shield: '/escudos/defensa.svg', colors: { primary: '#00843D', secondary: '#F7D417', text: '#ffffff' }, category: 'argentina' },
  { id: 'argentinos', name: 'Argentinos Juniors', shortName: 'AJ', shield: '/escudos/argentinos.svg', colors: { primary: '#C8102E', secondary: '#ffffff', text: '#ffffff' }, category: 'argentina' },
  { id: 'gimnasiajujuy', name: 'Gimnasia Jujuy', shortName: 'GyE', shield: '/escudos/gimnasiajujuy.svg', colors: { primary: '#1B4F9C', secondary: '#FFD700', text: '#ffffff' }, category: 'argentina' },

  { id: 'realmadrid', name: 'Real Madrid', shortName: 'RMA', shield: '/escudos/realmadrid.svg', colors: { primary: '#FFFFFF', secondary: '#FFD700', text: '#1a1a3e' }, category: 'internacional' },
  { id: 'barcelona', name: 'FC Barcelona', shortName: 'FCB', shield: '/escudos/barcelona.svg', colors: { primary: '#A50044', secondary: '#004D98', text: '#ffffff' }, category: 'internacional' },
]

export const getTeamById = (id) => teams.find((team) => team.id === id)

export const getTeamsByCategory = (category) =>
  category ? teams.filter((team) => team.category === category) : teams

// Normaliza el nombre que viene de Google Sheets al id del equipo.
export function teamIdFromName(name = '') {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return getTeamById(normalized)?.id || normalized || 'argentina'
}

// Si el equipo viene por nombre y no está en la lista, devolvemos el nombre original
// para poder mostrar un escudo provisorio con iniciales (equipos a medida).
export function customTeamNameFrom(name = '') {
  const id = teamIdFromName(name)
  return getTeamById(id) ? '' : String(name || '').trim()
}
