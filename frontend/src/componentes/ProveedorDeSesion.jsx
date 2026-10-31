import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { borrarToken, guardarToken, leerToken, registrarVencimientoDeSesion } from '../api/http.js'
import { usuarios } from '../api/servicios.js'
import { ContextoDeSesion } from '../api/sesion.js'

// La sesión vive en el token. No hay cierre de sesión en el backend:
// cerrar sesión es olvidar el token.
export default function ProveedorDeSesion({ children }) {
  const navegar = useNavigate()
  const [perfil, setPerfil] = useState(null)
  const [recuperando, setRecuperando] = useState(() => Boolean(leerToken()))
  const [errorDeRecuperacion, setErrorDeRecuperacion] = useState(null)

  useEffect(() => {
    registrarVencimientoDeSesion(() => {
      setPerfil(null)
      navegar('/iniciar-sesion', {
        replace: true,
        state: { aviso: { tipo: 'info', titulo: 'Sesión terminada', texto: 'Su sesión venció o no es válida. Inicie sesión de nuevo.' } },
      })
    })
  }, [navegar])

  // Al recargar, la sesión se recupera con GET /api/usuarios/perfil.
  useEffect(() => {
    if (!leerToken()) return
    usuarios
      .perfil()
      .then((r) => setPerfil(r.datos))
      .catch((error) => {
        if (error.estado !== 401) setErrorDeRecuperacion(error)
      })
      .finally(() => setRecuperando(false))
  }, [])

  const valor = useMemo(
    () => ({
      perfil,
      recuperando,
      errorDeRecuperacion,
      iniciar(token, nuevoPerfil) {
        guardarToken(token)
        setErrorDeRecuperacion(null)
        setPerfil(nuevoPerfil)
      },
      cerrar() {
        borrarToken()
        setPerfil(null)
        navegar('/iniciar-sesion', {
          state: { aviso: { tipo: 'info', titulo: 'Sesión cerrada', texto: 'Su sesión se cerró en este navegador.' } },
        })
      },
    }),
    [perfil, recuperando, errorDeRecuperacion, navegar],
  )

  return <ContextoDeSesion.Provider value={valor}>{children}</ContextoDeSesion.Provider>
}
