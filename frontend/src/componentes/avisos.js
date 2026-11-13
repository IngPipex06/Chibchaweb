import { MENSAJE_SIN_CONEXION } from '../api/http.js'
import { textoDeMotivo } from './validacion.js'

const TITULOS = {
  0: 'Sin conexión con el servidor',
  400: 'Revise los datos',
  401: 'Acceso no válido',
  403: 'Sin permiso',
  404: 'No encontrado',
  409: 'No se pudo completar',
  413: 'Archivo demasiado grande',
  422: 'Falla estructural en el archivo',
  429: 'Demasiados intentos',
  500: 'Error del servidor',
  502: 'El registrador no confirmó',
}

// Muestra el mensaje del backend tal cual; nunca lo reemplaza.
export function avisoDeError(error, titulo) {
  const estado = error?.estado ?? 0
  let texto = error?.message || MENSAJE_SIN_CONEXION
  if (estado === 502) texto += ' La solicitud sigue sin enviar.'
  return {
    tipo: 'error',
    titulo: titulo ?? TITULOS[estado] ?? 'No se pudo completar',
    texto,
    lista: (error?.errores ?? []).map(textoDeMotivo),
  }
}

export const avisoPendiente = (respuesta, extra) => ({
  tipo: 'critico',
  titulo: 'Quedó pendiente de reconciliación',
  texto: [respuesta?.datos?.mensaje ?? 'La base de datos no estaba disponible y los datos quedaron respaldados.', extra]
    .filter(Boolean)
    .join(' '),
})

export const avisoOk = (titulo, texto) => ({ tipo: 'ok', titulo, texto })
export const avisoInfo = (titulo, texto) => ({ tipo: 'info', titulo, texto })
