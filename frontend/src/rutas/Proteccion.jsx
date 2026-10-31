import { Navigate, Outlet } from 'react-router-dom'
import { INICIO_POR_TIPO, useSesion } from '../api/sesion.js'
import { avisoDeError } from '../componentes/avisos.js'
import { Aviso, Cargando } from '../componentes/Interfaz.jsx'

// Orienta al usuario según su tipo y permisos. La seguridad real está en el backend.
export function RutaProtegida({ tipos, permiso, children }) {
  const { perfil, recuperando, errorDeRecuperacion } = useSesion()

  if (recuperando) return <Cargando texto="Recuperando su sesión…" />
  if (!perfil) {
    if (errorDeRecuperacion) {
      return (
        <div className="rejilla" style={{ paddingTop: 32 }}>
          <Aviso {...avisoDeError(errorDeRecuperacion, 'No se pudo recuperar la sesión')} acciones={[{ etiqueta: 'Reintentar', alHacer: () => window.location.reload() }]} />
        </div>
      )
    }
    return <Navigate to="/iniciar-sesion" replace state={{ aviso: { tipo: 'info', titulo: 'Inicie sesión', texto: 'Esta página requiere una sesión activa.' } }} />
  }
  const permitido = (!tipos || tipos.includes(perfil.tipo)) && (!permiso || (perfil.permisos ?? []).includes(permiso))
  if (!permitido) {
    return <Navigate to={INICIO_POR_TIPO[perfil.tipo]} replace state={{ aviso: { tipo: 'error', titulo: 'Sin acceso', texto: 'Su rol no tiene acceso a esa página.' } }} />
  }
  return children ?? <Outlet />
}

// Registro, inicio de sesión y recuperación: con sesión activa se va al módulo propio.
export function SoloSinSesion() {
  const { perfil, recuperando } = useSesion()
  if (recuperando) return <Cargando texto="Recuperando su sesión…" />
  if (perfil) return <Navigate to={INICIO_POR_TIPO[perfil.tipo]} replace />
  return <Outlet />
}
