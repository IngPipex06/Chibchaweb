// Única puerta de salida hacia el backend. Resuelve una sola vez:
// cabecera de sesión, 401, errores en JSON, 202 de contingencia y descargas.

const CLAVE_TOKEN = 'chibchaweb.token'

export const MENSAJE_SIN_CONEXION = 'No se pudo conectar con la API. Verifique que el backend esté en ejecución.'

const MENSAJES = {
  400: 'Hay datos inválidos.',
  401: 'Su sesión no es válida.',
  403: 'No tiene permiso para esta acción.',
  404: 'El recurso no existe.',
  409: 'La acción choca con el estado actual.',
  413: 'El archivo supera el límite de 5 MB.',
  422: 'El archivo tiene una falla estructural.',
  429: 'Demasiados intentos. Espere antes de volver a intentar.',
  500: 'Error interno del servidor',
  502: 'El registrador simulado no confirmó.',
}

// El backend responde { error, campo, ...extras }. `error` ya viene en español.
export class ErrorDeApi extends Error {
  constructor(estado, datos = {}) {
    super(datos.error || MENSAJES[estado] || MENSAJE_SIN_CONEXION)
    this.estado = estado
    this.datos = datos
    this.campo = datos.campo ?? null
    this.errores = Array.isArray(datos.errores) ? datos.errores : []
  }
}

let alVencerSesion = () => {}
export function registrarVencimientoDeSesion(funcion) {
  alVencerSesion = funcion
}

export const leerToken = () => localStorage.getItem(CLAVE_TOKEN)
export const guardarToken = (token) => localStorage.setItem(CLAVE_TOKEN, token)
export const borrarToken = () => localStorage.removeItem(CLAVE_TOKEN)

async function enviar(metodo, ruta, { cuerpo, csv, publico = false } = {}) {
  const cabeceras = { Accept: 'application/json' }
  const token = leerToken()
  if (token && !publico) cabeceras.Authorization = `Bearer ${token}`

  let body
  if (csv !== undefined) {
    cabeceras['Content-Type'] = 'text/csv'
    body = csv
  } else if (cuerpo !== undefined) {
    cabeceras['Content-Type'] = 'application/json'
    body = JSON.stringify(cuerpo)
  }

  let respuesta
  try {
    respuesta = await fetch(`/api${ruta}`, { method: metodo, headers: cabeceras, body })
  } catch {
    throw new ErrorDeApi(0, { error: MENSAJE_SIN_CONEXION })
  }

  const esJson = (respuesta.headers.get('content-type') ?? '').includes('application/json')

  // 401 fuera de los formularios de acceso: se olvida el token y se vuelve a iniciar sesión.
  if (respuesta.status === 401 && !publico && token) {
    borrarToken()
    alVencerSesion()
    throw new ErrorDeApi(401, { error: 'Su sesión venció o no es válida. Inicie sesión de nuevo.' })
  }

  if (!respuesta.ok) {
    // El backend siempre responde errores en JSON; si no, la API no está detrás del proxy.
    if (!esJson) throw new ErrorDeApi(0, { error: MENSAJE_SIN_CONEXION })
    throw new ErrorDeApi(respuesta.status, await respuesta.json().catch(() => ({})))
  }
  return { respuesta, esJson }
}

// Devuelve { estado, datos, pendiente }. `pendiente` es el 202 de contingencia (RT4):
// no es un éxito definitivo y, salvo en migración, no trae id.
export async function pedir(metodo, ruta, opciones) {
  const { respuesta, esJson } = await enviar(metodo, ruta, opciones)
  const datos = respuesta.status === 204 || !esJson ? null : await respuesta.json()
  return { estado: respuesta.status, datos, pendiente: respuesta.status === 202 }
}

// PDF y XML exigen token: se piden con fetch y se entregan desde el blob.
// Un 4xx o 5xx llega como ErrorDeApi y nunca se guarda como archivo.
export async function descargar(ruta, nombrePorDefecto) {
  const { respuesta } = await enviar('GET', ruta)
  const disposicion = respuesta.headers.get('content-disposition') ?? ''
  const coincidencia = disposicion.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  const nombre = coincidencia ? decodeURIComponent(coincidencia[1]) : nombrePorDefecto
  const url = URL.createObjectURL(await respuesta.blob())
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
