import { PLAZO_EN_HORAS } from './valores.js'

export const estaVacio = (valor) => valor == null || valor === ''

export function fecha(valor) {
  if (estaVacio(valor)) return 'Sin dato'
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

// Fechas como 1990-05-20T05:00:00.000Z se recortan a AAAA-MM-DD para mostrar y enviar.
export const soloFecha = (valor) => (estaVacio(valor) ? '' : String(valor).slice(0, 10))

export const monto = (valor) =>
  estaVacio(valor) ? 'Sin dato' : `$ ${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`

// comisiónAplicable llega como texto ("15.00") y es un porcentaje.
export const porcentaje = (valor) =>
  estaVacio(valor) || Number.isNaN(Number(valor)) ? 'Sin dato' : `${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`

// Informativo: el backend decide el vencimiento. Cada escalamiento reinicia fechaInicioSLA.
export function atencionAntesDe(ticket) {
  const horas = PLAZO_EN_HORAS[ticket.prioridad]
  if (!ticket.fechaInicioSLA || !horas) return 'Sin dato'
  return fecha(new Date(new Date(ticket.fechaInicioSLA).getTime() + horas * 3600000).toISOString())
}

export const cantidad = (valor) => (Array.isArray(valor) ? valor.length : (valor ?? 0))
export const comoTexto = (valor) => (estaVacio(valor) ? 'Sin dato' : typeof valor === 'object' ? Object.values(valor).join(', ') : String(valor))
export const idCorto = (id) => String(id ?? '').slice(0, 8)
export const numeroDeFactura = (f) => (f == null ? 'Sin dato' : typeof f === 'object' ? (f.número ?? f.numero ?? f.id ?? 'Sin dato') : f)

export function cuentaRegresiva(ms) {
  const segundos = Math.ceil(ms / 1000)
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
}
