import { useState } from 'react'
import { useSesion } from '../../api/sesion.js'
import { avisoDeError, avisoOk, avisoPendiente } from '../../componentes/avisos.js'
import Dialogo from '../../componentes/Dialogo.jsx'
import { etiqueta } from '../../componentes/valores.js'
import { porcentaje } from '../../componentes/formato.js'
import Formulario from '../../componentes/Formulario.jsx'
import { useDatos, useEnvio, useFormulario } from '../../componentes/ganchos.js'
import { Celda, ConDatos, Etiqueta, Ficha, Pagina, Tabla, Tarjeta } from '../../componentes/Interfaz.jsx'
import { GESTIONES } from './configuracionDeGestiones.js'

const celda = (d, i) => (d.estado !== undefined ? <Etiqueta key={i} valor={d.estado} /> : <Celda key={i} texto={d.texto} secundario={d.secundario} fuerte={d.fuerte} />)
const CAMPO_DOMINIO = [{ nombre: 'nombre', etiqueta: 'Dominio', obligatorio: true, formato: 'dominio', completo: true, marcador: 'misitio.com', ayuda: 'El dominio debe existir en el sistema.' }]

// Lista, ficha, crear, editar e inhabilitar. El borrado es lógico: se inhabilita, nunca se elimina.
export default function GestionDePerfiles({ tipo }) {
  const g = GESTIONES[tipo]
  const { perfil } = useSesion()
  const [vista, setVista] = useState({ modo: 'lista' })
  const [aviso, setAviso] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState('')
  const [dialogo, setDialogo] = useState(null)
  const [ocupado, ejecutar] = useEnvio()
  const formulario = useFormulario()
  const lista = useDatos(() => g.api.listar(buscando), [tipo, buscando])

  const verFicha = (id) => setVista((v) => ({ modo: 'ficha', id, version: (v.version ?? 0) + 1 }))

  if (vista.modo === 'crear' || vista.modo === 'editar') {
    const crear = vista.modo === 'crear'
    const tipoDePersonal = tipo === 'personal' ? (crear ? formulario.valores.tipo : vista.tipoDePersonal) : null
    const propio = !crear && tipo === 'personal' && String(vista.ficha.id) === String(perfil.id)
    const campos = g.campos({ crear, tipoDePersonal, propio })

    const guardar = () =>
      ejecutar('guardar', async () => {
        if (!formulario.validar(campos)) return
        const cuerpo = g.cuerpo(formulario.valores, { crear, tipoDePersonal })
        try {
          const r = crear ? await g.api.crear(cuerpo) : await g.api.editar(vista.ficha.id, cuerpo)
          formulario.reiniciar()
          lista.recargar()
          if (r.pendiente) {
            // Sin id: no se abre la ficha ni se cuenta en la lista.
            setAviso(avisoPendiente(r, crear ? 'El perfil no aparecerá en la lista hasta que se concilie.' : ''))
            return setVista({ modo: 'lista' })
          }
          setAviso(avisoOk(crear ? 'Perfil creado' : 'Cambios guardados', `${g.nombre(r.datos ?? cuerpo)} quedó ${crear ? 'registrado' : 'actualizado'}.`))
          if (r.datos?.id) verFicha(r.datos.id)
          else setVista({ modo: 'lista' })
        } catch (error) {
          formulario.marcarError(error)
          setAviso(avisoDeError(error))
        }
      })

    let intro
    if (!crear && tipo === 'distribuidores') {
      intro = <p className="intro">Categoría {etiqueta(vista.ficha.categoría)} · Comisión {porcentaje(vista.ficha.comisiónAplicable)}. Las recalcula el cierre mensual y no se editan aquí.</p>
    }
    if (!crear && tipo === 'personal') intro = <p className="intro">Tipo: {etiqueta(tipoDePersonal)}. El tipo no se edita.</p>

    return (
      <Pagina antetitulo={g.titulo} titulo={crear ? `Crear ${g.singular}` : `Editar a ${g.nombre(vista.ficha)}`} aviso={aviso} alCerrarAviso={() => setAviso(null)}>
        <Tarjeta anchoMaximo="880px">
          <Formulario
            campos={campos}
            formulario={formulario}
            intro={intro}
            alEnviar={guardar}
            enviando={ocupado.has('guardar')}
            textoEnviar={crear ? 'Crear perfil' : 'Guardar cambios'}
            textoEnviando="Guardando…"
            alCancelar={() => (crear ? setVista({ modo: 'lista' }) : verFicha(vista.ficha.id))}
          />
        </Tarjeta>
      </Pagina>
    )
  }

  if (vista.modo === 'ficha') {
    return (
      <Pagina
        antetitulo={g.titulo}
        titulo="Ficha"
        aviso={aviso}
        alCerrarAviso={() => setAviso(null)}
        acciones={<button type="button" className="boton boton-secundario" onClick={() => { setVista({ modo: 'lista' }); lista.recargar() }}>Volver a la lista</button>}
      >
        <FichaDePerfil
          key={`${vista.id}-${vista.version}`}
          g={g}
          id={vista.id}
          ocupado={ocupado}
          alEditar={(x) => {
            formulario.reiniciar(g.aFormulario(x))
            setVista({ modo: 'editar', ficha: x, tipoDePersonal: g.tipoDe?.(x) })
          }}
          alInhabilitar={(x) =>
            setDialogo({
              titulo: `Inhabilitar a ${g.nombre(x)}`,
              texto: 'El perfil no se elimina: queda Inactivo y no podrá iniciar sesión.',
              textoConfirmar: 'Inhabilitar',
              alConfirmar: async () => {
                try {
                  await g.api.inhabilitar(x.id)
                  setAviso(avisoOk('Perfil inhabilitado', `${g.nombre(x)} ahora figura como Inactivo.`))
                } catch (error) {
                  setAviso(avisoDeError(error))
                }
                setDialogo(null)
                verFicha(x.id)
              },
            })
          }
          alReactivar={(x) =>
            ejecutar(`reactivar-${x.id}`, async () => {
              try {
                await g.api.reactivar(x.id)
                setAviso(avisoOk('Cliente reactivado', `${g.nombre(x)} vuelve a estar Activo.`))
              } catch (error) {
                setAviso(avisoDeError(error))
              }
              verFicha(x.id)
            })
          }
        />
        {g.conDominios && <DominiosDelDistribuidor id={vista.id} setAviso={setAviso} setDialogo={setDialogo} />}
        {dialogo && <Dialogo {...dialogo} alCancelar={() => setDialogo(null)} />}
      </Pagina>
    )
  }

  return (
    <Pagina
      antetitulo="Administrador"
      titulo={g.titulo}
      descripcion="Los perfiles no se eliminan: se inhabilitan y quedan como Inactivo."
      aviso={aviso}
      alCerrarAviso={() => setAviso(null)}
      acciones={
        <button type="button" className="boton boton-primario" onClick={() => { formulario.reiniciar(g.valoresIniciales ?? {}); setVista({ modo: 'crear' }) }}>
          Crear {g.singular}
        </button>
      }
    >
      <Tarjeta>
        <form className="acciones" style={{ alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); setBuscando(busqueda.trim()) }}>
          <div className="campo" style={{ flex: '1 1 260px' }}>
            <label htmlFor={`buscar-${tipo}`}>Buscar</label>
            <input id={`buscar-${tipo}`} className="entrada" type="search" value={busqueda} placeholder={g.marcadorDeBusqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <button type="submit" className="boton boton-secundario">Buscar</button>
        </form>
        <ConDatos consulta={lista}>
          {(datos) => (
            <Tabla
              etiqueta={g.titulo}
              columnas={g.columnas}
              vacio={buscando ? 'No hay resultados para esa búsqueda.' : 'No hay perfiles registrados.'}
              filas={datos.map((x) => ({
                clave: x.id,
                celdas: g.fila(x).map(celda),
                acciones: [<button key="ver" type="button" className="boton boton-secundario boton-pequeno" onClick={() => verFicha(x.id)}>Ver ficha</button>],
              }))}
            />
          )}
        </ConDatos>
      </Tarjeta>
    </Pagina>
  )
}

function FichaDePerfil({ g, id, ocupado, alEditar, alInhabilitar, alReactivar }) {
  const consulta = useDatos(() => g.api.obtener(id), [id])
  return (
    <Tarjeta antetitulo={g.titulo} titulo={consulta.datos ? g.nombre(consulta.datos) : 'Ficha'}>
      <ConDatos consulta={consulta}>
        {(x) => (
          <>
            <Ficha pares={g.pares(x).map(([clave, valor, completo]) => [clave, celda(valor, clave), completo])} />
            <div className="acciones">
              <button type="button" className="boton boton-primario" onClick={() => alEditar(x)}>Editar</button>
              {x.estado === 'Activo' && <button type="button" className="boton boton-secundario" onClick={() => alInhabilitar(x)}>Inhabilitar</button>}
              {/* Solo los clientes se reactivan. */}
              {g.reactivable && x.estado === 'Inhabilitado' && (
                <button type="button" className="boton boton-secundario" disabled={ocupado.has(`reactivar-${x.id}`)} onClick={() => alReactivar(x)}>
                  {ocupado.has(`reactivar-${x.id}`) ? 'Reactivando…' : 'Reactivar'}
                </button>
              )}
            </div>
          </>
        )}
      </ConDatos>
    </Tarjeta>
  )
}

function DominiosDelDistribuidor({ id, setAviso, setDialogo }) {
  const g = GESTIONES.distribuidores
  const dominios = useDatos(() => g.api.dominios(id), [id])
  const formulario = useFormulario()
  const [ocupado, ejecutar] = useEnvio()

  const asignar = () =>
    ejecutar('asignar', async () => {
      if (!formulario.validar(CAMPO_DOMINIO)) return
      const nombre = formulario.valores.nombre.trim()
      try {
        await g.api.asignarDominio(id, nombre)
        setAviso(avisoOk('Dominio asignado', `${nombre} quedó asignado al distribuidor.`))
        formulario.reiniciar()
      } catch (error) {
        formulario.marcarError(error)
        setAviso(avisoDeError(error))
      }
      dominios.recargar()
    })

  const quitar = (nombre) =>
    setDialogo({
      titulo: 'Quitar dominio',
      texto: `${nombre} dejará de estar asignado a este distribuidor.`,
      textoConfirmar: 'Quitar',
      alConfirmar: async () => {
        try {
          await g.api.quitarDominio(id, nombre)
          setAviso(avisoOk('Dominio retirado', `${nombre} ya no está asignado.`))
        } catch (error) {
          setAviso(avisoDeError(error))
        }
        setDialogo(null)
        dominios.recargar()
      },
    })

  return (
    <>
      <Tarjeta mitad titulo="Asignar dominio">
        <Formulario campos={CAMPO_DOMINIO} formulario={formulario} alEnviar={asignar} enviando={ocupado.has('asignar')} textoEnviar="Asignar" textoEnviando="Asignando…" />
      </Tarjeta>
      <Tarjeta mitad titulo="Dominios asignados">
        <ConDatos consulta={dominios}>
          {(lista) => (
            <Tabla
              etiqueta="Dominios asignados"
              columnas={['Dominio']}
              vacio="No tiene dominios asignados."
              filas={lista.map((d) => {
                const nombre = typeof d === 'string' ? d : d.nombre
                return {
                  clave: nombre,
                  celdas: [<Celda key="n" fuerte texto={nombre} />],
                  acciones: [<button key="q" type="button" className="boton boton-secundario boton-pequeno" onClick={() => quitar(nombre)}>Quitar</button>],
                }
              })}
            />
          )}
        </ConDatos>
      </Tarjeta>
    </>
  )
}
