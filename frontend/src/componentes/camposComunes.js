import { FRANQUICIAS } from './valores.js'

// Campos compartidos entre medios de pago (UC17) y la gestión de clientes (UC6).
export const CAMPOS_DE_TARJETA = [
  { nombre: 'franquicia', etiqueta: 'Franquicia', tipo: 'opciones', opciones: FRANQUICIAS, obligatorio: true, completo: true },
  { nombre: 'numero', etiqueta: 'Número de tarjeta', obligatorio: true, max: 19, teclado: 'numeric', completo: true },
  { nombre: 'fechaExpiración', etiqueta: 'Fecha de expiración', tipo: 'fecha', obligatorio: true, formato: 'fecha' },
]

export const cuerpoDeTarjeta = (v) => ({
  franquicia: v.franquicia,
  numero: String(v.numero ?? '').replace(/\s+/g, ''),
  fechaExpiración: v.fechaExpiración,
})

export const campoCorreo = { nombre: 'correo', etiqueta: 'Correo', tipo: 'correo', obligatorio: true, formato: 'correo', autocompletar: 'email' }
export const campoContraseñaNueva = { nombre: 'contraseña', etiqueta: 'Contraseña', tipo: 'contraseña', obligatorio: true, formato: 'contraseña', autocompletar: 'new-password', ayuda: 'Mínimo 8 caracteres.' }
