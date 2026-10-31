import { Link, NavLink } from 'react-router-dom'
import { INICIO_POR_TIPO, useSesion } from '../api/sesion.js'
import { enlacesDelMenu } from './navegacion.js'
import { etiqueta } from './valores.js'

function descripcionDelUsuario(perfil) {
  if (perfil.tipo === 'Administrador' && perfil.rol) return perfil.rol
  if (perfil.tipo === 'TécnicoDeSoporte') return `${etiqueta(perfil.tipo)} · ${etiqueta(perfil.nivelDeServicio)}`
  return etiqueta(perfil.tipo)
}

export default function Encabezado() {
  const { perfil, recuperando, cerrar } = useSesion()
  const enlaces = enlacesDelMenu(perfil)

  return (
    <header className="encabezado contenedor">
      <Link to={perfil ? INICIO_POR_TIPO[perfil.tipo] : '/'} className="marca">
        <span className="marca-simbolo" aria-hidden="true"><span /><span /></span>
        ChibchaWeb
      </Link>
      {enlaces.length > 0 && (
        <nav aria-label="Módulo" className="menu">
          {enlaces.map(([texto, ruta, exacta]) => (
            <NavLink key={ruta} to={ruta} end={exacta} className="enlace-menu">{texto}</NavLink>
          ))}
        </nav>
      )}
      {perfil && (
        <div className="usuario">
          <div>
            <strong>{perfil.nombre ?? perfil.correo}</strong>
            <span>{descripcionDelUsuario(perfil)}</span>
          </div>
          <button type="button" className="boton boton-secundario" onClick={cerrar}>Cerrar sesión</button>
        </div>
      )}
      {!perfil && !recuperando && (
        <div className="acciones">
          <Link className="boton boton-secundario" to="/iniciar-sesion">Iniciar sesión</Link>
          <Link className="boton boton-primario" to="/registro">Registrarme</Link>
        </div>
      )}
    </header>
  )
}
