import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { avisoDeError } from './avisos.js'
import { TONOS, etiqueta } from './valores.js'

const MARCAS = { error: '!', ok: '✓', info: 'i', critico: '!' }

export function Aviso({ tipo = 'info', titulo, texto, lista = [], acciones = [], alCerrar }) {
  return (
    <div className={`aviso aviso-${tipo} ancho-completo`} role={tipo === 'error' || tipo === 'critico' ? 'alert' : 'status'}>
      <span className="aviso-marca" aria-hidden="true">{MARCAS[tipo]}</span>
      <div className="aviso-cuerpo">
        <p className="aviso-titulo">{titulo}</p>
        {texto && <p>{texto}</p>}
        {lista.length > 0 && (
          <ul>
            {lista.map((motivo, i) => <li key={i}>{motivo}</li>)}
          </ul>
        )}
        {acciones.length > 0 && (
          <div className="acciones">
            {acciones.map((a) => (
              <button key={a.etiqueta} type="button" className={`boton ${a.primario ? 'boton-primario' : 'boton-secundario'}`} onClick={a.alHacer}>
                {a.etiqueta}
              </button>
            ))}
          </div>
        )}
      </div>
      {alCerrar && (
        <button type="button" className="boton boton-icono" aria-label="Cerrar aviso" onClick={alCerrar}>×</button>
      )}
    </div>
  )
}

// Encabezado de página + avisos. Muestra también el aviso que llega al navegar
// (por ejemplo, "Registro completado") y lo quita del historial.
export function Pagina({ antetitulo, titulo, descripcion, acciones, aviso, alCerrarAviso, children }) {
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const [avisoDeNavegacion, setAvisoDeNavegacion] = useState(ubicacion.state?.aviso ?? null)

  useEffect(() => {
    if (ubicacion.state?.aviso) navegar(ubicacion.pathname + ubicacion.search, { replace: true, state: null })
  }, [ubicacion, navegar])

  useEffect(() => {
    if (aviso) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [aviso])

  return (
    <>
      <header className="pagina-cabecera">
        <div>
          {antetitulo && <p className="antetitulo">{antetitulo}</p>}
          <h1>{titulo}</h1>
          {descripcion && <p className="descripcion">{descripcion}</p>}
        </div>
        {acciones && <div className="acciones">{acciones}</div>}
      </header>
      <div className="rejilla">
        {avisoDeNavegacion && <Aviso {...avisoDeNavegacion} alCerrar={() => setAvisoDeNavegacion(null)} />}
        {aviso && <Aviso {...aviso} alCerrar={alCerrarAviso} />}
        {children}
      </div>
    </>
  )
}

export function Tarjeta({ antetitulo, titulo, nota, acciones, mitad = false, anchoMaximo, children }) {
  return (
    <section className={`tarjeta${mitad ? '' : ' ancho-completo'}`} style={anchoMaximo ? { maxWidth: anchoMaximo } : undefined}>
      {(titulo || acciones || antetitulo) && (
        <div className="tarjeta-cabecera">
          <div>
            {antetitulo && <p className="antetitulo">{antetitulo}</p>}
            {titulo && <h3>{titulo}</h3>}
            {nota && <p className="tarjeta-nota">{nota}</p>}
          </div>
          {acciones && <div className="acciones">{acciones}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Etiqueta({ valor, texto }) {
  return <span className={`etiqueta tono-${TONOS[valor] ?? 'neutro'}`}>{texto ?? etiqueta(valor)}</span>
}

export function Celda({ texto, secundario, fuerte }) {
  return (
    <>
      <span className={fuerte ? 'fuerte' : undefined}>{texto == null || texto === '' ? 'Sin dato' : texto}</span>
      {secundario && <span className="celda-secundaria">{secundario}</span>}
    </>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return <p className="cargando" role="status">{texto}</p>
}

export function ErrorDeCarga({ error, alReintentar }) {
  return <Aviso {...avisoDeError(error)} acciones={alReintentar ? [{ etiqueta: 'Reintentar', alHacer: alReintentar }] : []} />
}

// Carga, error y contenido de una consulta de useDatos.
export function ConDatos({ consulta, children }) {
  if (consulta.datos === undefined) {
    return consulta.error ? <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /> : <Cargando />
  }
  return (
    <>
      {consulta.error && <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} />}
      {children(consulta.datos)}
    </>
  )
}

export function Tabla({ etiqueta: nombre, columnas, filas, vacio = 'No hay registros.' }) {
  if (!filas.length) return <p className="vacio">{vacio}</p>
  const conAcciones = filas.some((f) => f.acciones?.length)
  return (
    <div className="tabla-contenedor" role="region" aria-label={nombre} tabIndex={0}>
      <table className="tabla">
        <thead>
          <tr>
            {columnas.map((c) => <th key={c} scope="col">{c}</th>)}
            {conAcciones && <th scope="col" className="a-la-derecha">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.clave}>
              {f.celdas.map((c, i) => <td key={i}>{c}</td>)}
              {conAcciones && (
                <td><div className="acciones a-la-derecha">{f.acciones}</div></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// pares: [etiqueta, valor, completo?]
export function Ficha({ pares }) {
  return (
    <dl className="ficha">
      {pares.map(([clave, valor, completo]) => (
        <div key={clave} style={completo ? { gridColumn: '1 / -1' } : undefined}>
          <dt>{clave}</dt>
          <dd>{valor == null || valor === '' ? 'Sin dato' : valor}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Resumen({ items }) {
  return (
    <div className="resumen">
      {items.map(([clave, valor]) => (
        <div key={clave}>
          <strong>{valor}</strong>
          <span>{clave}</span>
        </div>
      ))}
    </div>
  )
}

const FONDOS = ['fondo-azul', 'fondo-rosa', 'fondo-vino']

export function Accesos({ items }) {
  if (!items.length) return <p className="vacio">No hay accesos disponibles para su rol.</p>
  return (
    <div className="accesos">
      {items.map((item, i) => (
        <Link key={item.a} to={item.a} className="acceso">
          <span className={`acceso-numero ${FONDOS[i % FONDOS.length]}`} aria-hidden="true">{i + 1}</span>
          <strong>{item.titulo}</strong>
          <span className="acceso-texto">{item.texto}</span>
        </Link>
      ))}
    </div>
  )
}
