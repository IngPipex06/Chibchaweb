import { useState } from 'react'
import { migraciones } from '../../api/servicios.js'
import { avisoDeError, avisoInfo, avisoOk } from '../../componentes/avisos.js'
import { cantidad, comoTexto, fecha, idCorto } from '../../componentes/formato.js'
import Formulario from '../../componentes/Formulario.jsx'
import { useDatos, useEnvio, useFormulario } from '../../componentes/ganchos.js'
import { Aviso, Celda, ConDatos, Etiqueta, Ficha, Pagina, Resumen, Tabla, Tarjeta } from '../../componentes/Interfaz.jsx'
import { etiqueta } from '../../componentes/valores.js'

const CAMPOS = [{ nombre: 'archivo', etiqueta: 'Archivo CSV', tipo: 'archivo', obligatorio: true, completo: true }]

// Hueco 2: el sistema no lista migraciones. Los id se guardan en este navegador.
const CLAVE_MIGRACIONES = 'chibchaweb.migraciones'
const leerMigraciones = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_MIGRACIONES) ?? '[]')
  } catch {
    return []
  }
}

// UC26 a UC28.
export default function Migracion() {
  const formulario = useFormulario()
  const [ocupado, ejecutar] = useEnvio()
  const [aviso, setAviso] = useState(null)
  const [conocidas, setConocidas] = useState(leerMigraciones)
  const [resultado, setResultado] = useState(null)
  const [reporte, setReporte] = useState(null)

  const recordar = (cambio) => {
    if (cambio.id == null) return
    setConocidas((lista) => {
      const limpio = Object.fromEntries(Object.entries(cambio).filter(([, v]) => v !== undefined))
      const i = lista.findIndex((m) => String(m.id) === String(cambio.id))
      const nueva = i >= 0 ? lista.map((m, j) => (j === i ? { ...m, ...limpio } : m)) : [{ fecha: new Date().toISOString(), ...limpio }, ...lista]
      localStorage.setItem(CLAVE_MIGRACIONES, JSON.stringify(nueva))
      return nueva
    })
  }

  // Resultado de iniciar o reanudar: id, estado, posición, migrados, duplicados, inconsistencias.
  const procesar = (r, nombreArchivo) => {
    const d = r.datos ?? {}
    if (r.pendiente) {
      // 202 con id: la base cayó a mitad de carga.
      recordar({ id: d.id, nombreArchivo, interrumpida: true })
      return setAviso({ tipo: 'critico', titulo: 'Carga interrumpida', texto: [d.mensaje, d.id ? `La base de datos cayó a mitad de carga. Reanude la migración ${idCorto(d.id)} cuando vuelva.` : ''].filter(Boolean).join(' ') })
    }
    recordar({ id: d.id, nombreArchivo, estado: d.estado, migrados: cantidad(d.migrados), duplicados: cantidad(d.duplicados), inconsistencias: cantidad(d.inconsistencias), interrumpida: false })
    setResultado(d)
    setAviso(d.estado === 'Completado' ? avisoOk(`Migración ${idCorto(d.id)} completada`, '') : avisoInfo(`Migración ${idCorto(d.id)}: ${etiqueta(d.estado)}`, ''))
  }

  const procesarError = (error, nombreArchivo, previo) => {
    if (error.estado === 422) {
      // Falla estructural: se deshizo la sesión completa. El id también se guarda.
      recordar({ id: error.datos.id, nombreArchivo, estado: 'RevertidoPorErrorEstructural', interrumpida: false })
      return setAviso(avisoDeError(error, 'Falla estructural: se revirtió la carga completa'))
    }
    if (previo) recordar(previo)
    formulario.marcarError(error)
    setAviso(avisoDeError(error))
  }

  const iniciar = () =>
    ejecutar('iniciar', async () => {
      if (!formulario.validar(CAMPOS)) return
      const archivo = formulario.valores.archivo
      try {
        procesar(await migraciones.iniciar(archivo.nombre, archivo.texto), archivo.nombre)
      } catch (error) {
        procesarError(error, archivo.nombre)
      }
    })

  // Reanudar continúa desde el último punto de control y necesita el archivo otra vez.
  const reanudar = (m) => {
    const archivo = formulario.valores.archivo
    if (!archivo?.texto) {
      formulario.marcarError({ campo: 'archivo', message: 'Seleccione otra vez el mismo archivo para reanudar.' })
      return setAviso(avisoInfo('Falta el archivo', `Para reanudar la migración ${idCorto(m.id)} seleccione de nuevo el mismo archivo (${m.nombreArchivo ?? 'CSV'}).`))
    }
    const previo = { id: m.id, estado: m.estado, interrumpida: m.interrumpida }
    recordar({ id: m.id, estado: 'EnProgreso' })
    ejecutar(`reanudar-${m.id}`, async () => {
      try {
        procesar(await migraciones.reanudar(m.id, archivo.texto), archivo.nombre)
      } catch (error) {
        procesarError(error, archivo.nombre, previo)
      }
    })
  }

  // Clave propia: no la bloquea la reanudación abierta, que es justo cuando se puede pausar.
  const pausar = (m) =>
    ejecutar(`pausar-${m.id}`, async () => {
      try {
        const { datos } = await migraciones.pausar(m.id)
        recordar({ id: m.id, estado: datos?.estado ?? 'Pausado' })
        setAviso(avisoOk(`Pausa solicitada para la migración ${idCorto(m.id)}`, 'Cuando termine la petición en curso se mostrará su estado y posición. Para reanudarla, seleccione otra vez el mismo archivo.'))
      } catch (error) {
        setAviso(avisoDeError(error))
      }
    })

  return (
    <Pagina antetitulo="Administrador" titulo="Migración de datos legados" aviso={aviso} alCerrarAviso={() => setAviso(null)}>
      {ocupado.has('iniciar') && (
        <Aviso tipo="info" titulo="Migración en curso" texto="La primera carga no informa su número hasta terminar, así que todavía no se puede pausar. La pausa queda disponible al reanudar una migración." />
      )}
      <Tarjeta
        mitad
        titulo="Cargar archivo legado"
        nota="Columnas: ID_Cliente_Legado, Nombre, Dominio, Plan de Hosting, Estado, Tarjeta, Correo. Máximo 5 MB. Un error en una fila no detiene la carga: va al reporte."
      >
        <Formulario campos={CAMPOS} formulario={formulario} alEnviar={iniciar} enviando={ocupado.has('iniciar')} textoEnviar="Iniciar migración" textoEnviando="Migrando…" />
      </Tarjeta>
      <Tarjeta mitad titulo="Migraciones lanzadas" nota="El sistema no lista migraciones: sus números se guardan en este navegador. Para reanudar, seleccione otra vez el mismo archivo.">
        <Tabla
          etiqueta="Migraciones lanzadas"
          columnas={['Migración', 'Estado', 'Avance']}
          vacio="Todavía no ha lanzado migraciones desde este navegador."
          filas={conocidas.map((m) => {
            const reanudando = ocupado.has(`reanudar-${m.id}`)
            const puedeReanudar = !reanudando && (m.estado === 'Pausado' || m.estado === 'EnProgreso' || m.interrumpida)
            return {
              clave: m.id,
              celdas: [
                <Celda key="m" fuerte texto={idCorto(m.id)} secundario={`${m.nombreArchivo ?? ''} · ${fecha(m.fecha)}`} />,
                m.estado ? <Etiqueta key="e" valor={m.estado} /> : <Etiqueta key="e" valor="interrumpida" texto="Interrumpida" />,
                <Celda key="a" texto={`${m.migrados ?? 0} migrados`} secundario={`${m.duplicados ?? 0} duplicados · ${m.inconsistencias ?? 0} inconsistencias`} />,
              ],
              acciones: [
                m.estado === 'EnProgreso' && (
                  <button key="p" type="button" className="boton boton-secundario boton-pequeno" disabled={ocupado.has(`pausar-${m.id}`)} onClick={() => pausar(m)}>
                    {ocupado.has(`pausar-${m.id}`) ? 'Pausando…' : 'Pausar'}
                  </button>
                ),
                puedeReanudar && (
                  <button key="r" type="button" className="boton boton-primario boton-pequeno" disabled={ocupado.has('iniciar')} onClick={() => reanudar(m)}>Reanudar</button>
                ),
                <button key="i" type="button" className="boton boton-secundario boton-pequeno" onClick={() => setReporte({ id: m.id, version: Date.now() })}>Reporte</button>,
              ].filter(Boolean),
            }
          })}
        />
      </Tarjeta>
      {resultado && (
        <Tarjeta antetitulo="Resultado" titulo={`Migración ${idCorto(resultado.id)}`}>
          <Resumen items={[['Estado', etiqueta(resultado.estado)], ['Posición', resultado.posición ?? 'Sin dato'], ['Migrados', cantidad(resultado.migrados)], ['Duplicados', cantidad(resultado.duplicados)], ['Inconsistencias', cantidad(resultado.inconsistencias)]]} />
          {resultado.reporteIncompleto && (
            <>
              <Aviso tipo="critico" titulo="El reporte quedó incompleto" texto="Estas entradas no están en el reporte de inconsistencias." />
              <TablaDeEntradas etiqueta="Entradas retenidas" entradas={resultado.entradasRetenidas ?? []} vacio="Sin entradas retenidas." />
            </>
          )}
        </Tarjeta>
      )}
      {reporte && <Reporte key={`${reporte.id}-${reporte.version}`} id={reporte.id} alCerrar={() => setReporte(null)} />}
    </Pagina>
  )
}

function TablaDeEntradas({ etiqueta: nombre, entradas, vacio }) {
  return (
    <Tabla
      etiqueta={nombre}
      columnas={['Registro original', 'Motivo', 'Fecha']}
      vacio={vacio}
      filas={entradas.map((e, i) => ({ clave: i, celdas: [comoTexto(e.registroOriginal), e.motivo ?? 'Sin dato', fecha(e.fecha)] }))}
    />
  )
}

function Reporte({ id, alCerrar }) {
  const consulta = useDatos(() => migraciones.reporte(id), [id])
  return (
    <Tarjeta antetitulo="Reporte de inconsistencias" titulo={`Migración ${idCorto(id)}`} acciones={<button type="button" className="boton boton-fantasma" onClick={alCerrar}>Cerrar reporte</button>}>
      <ConDatos consulta={consulta}>
        {(x) => (
          <>
            <Ficha pares={[
              ['Estado', <Etiqueta key="e" valor={x.estado} />],
              ['Archivo', x.nombreArchivo],
              ['Ejecución', fecha(x.fechaEjecución)],
              ['Administrador', typeof x.administrador === 'object' && x.administrador ? x.administrador.nombre ?? x.administrador.correo : x.administrador],
            ]} />
            <TablaDeEntradas etiqueta="Entradas del reporte" entradas={x.entradas ?? []} vacio="El reporte no tiene inconsistencias." />
          </>
        )}
      </ConDatos>
    </Tarjeta>
  )
}
