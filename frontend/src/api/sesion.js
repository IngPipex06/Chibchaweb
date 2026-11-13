import { createContext, useContext } from 'react'

export const ContextoDeSesion = createContext(null)
export const useSesion = () => useContext(ContextoDeSesion)

// UC2 paso 2: se recuerda solo el correo, nunca la contraseña.
export const CLAVE_CORREO = 'chibchaweb.correo'

// UC2 paso 11: cada tipo llega a su módulo.
export const INICIO_POR_TIPO = {
  Cliente: '/cliente',
  Distribuidor: '/distribuidor',
  Administrador: '/administrador',
  TécnicoDeSoporte: '/tecnico',
}
