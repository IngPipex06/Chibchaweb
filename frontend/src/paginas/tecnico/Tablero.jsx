import { useEffect, useRef, useState } from 'react'
import { soporte } from '../../api/servicios.js'
import { useSesion } from '../../api/sesion.js'
import { avisoDeError, avisoOk } from '../../componentes/avisos.js'
import Dialogo from '../../componentes/Dialogo.jsx'
import { atencionAntesDe, fecha, idCorto } from '../../componentes/formato.js'
import { useDatos, useEnvio } from '../../componentes/ganchos.js'
import { Celda, ConDatos, Etiqueta, Pagina, Tabla, Tarjeta } from '../../componentes/Interfaz.jsx'
import { ESTADOS_DEL_TABLERO, PRIORIDADES, etiqueta } from '../../componentes/valores.js'

const UN_MINUTO = 60 * 1000

const OPERACIONES = {
  nota: { titulo: 'Nota de avance', campo: 'Nota', confirmar: 'Guardar nota', texto: 'Se guarda solo la última nota. No cambia el estado del ticket.', llamar: soporte.anotar },
  escalar: { titulo: 'Escalar ticket', campo: 'Motivo', confirmar: 'Escalar', texto: 'El ticket pasa al siguiente nivel y sale de su tablero.', llamar: soporte.escalar },
  resolver: { titulo: 'Resolver ticket', campo: 'Solución', confirmar: 'Resolver', texto: 'El solicitante verá la solución en sus tickets.', llamar: soporte.resolver },
}

// UC23, UC24 y UC25. El backend entrega los tickets sin resolver del nivel del
// técnico y en orden: primero rezagados, luego prioridad y SLA más antiguo.
// El front conserva ese orden.
export default function Tablero() {
  const { perfil } = useSesion()
  const [filtros, setFiltros] = useState({ estado: '', prioridad: '' })
  const tablero = useDatos(() => soporte.tablero(filtros), [filtros.estado, filtros.prioridad])
  const [ocupado, ejecutar] = useEnvio()
  const [aviso, setAviso] = useState(null)
  const [dialogo, setDialogo] = useState(null)

  // UC25: un temporizador del backend escala los vencidos cada minuto, así que el
  // tablero se refresca solo. Con un diálogo abierto no se refresca, para no cerrarlo
  // ni borrar lo escrito.
  const hayDialogo = useRef(false)
  useEffect(() => {
    hayDialogo.current = Boolean(dialogo)
  }, [dialogo])
  const { recargar } = tablero
  useEffect(() => {
    const temporizador = setInterval(() => {
      if (!hayDialogo.current && !document.hidden) recargar()
    }, UN_MINUTO)
    return () => clearInterval(temporizador)
  }, [recargar])

  const tomar = (t) =>
    ejecutar(`tomar-${t.id}`, async () => {
      try {
        await soporte.tomar(t.id)
        setAviso(avisoOk(`Ticket ${idCorto(t.id)} tomado`, 'Ahora puede anotar avances, escalarlo o resolverlo.'))
      } catch (error) {
        setAviso(avisoDeError(error))
      }
      recargar()
    })

  const abrirOperacion = (t, clave) => {
    const op = OPERACIONES[clave]
    setDialogo({
      titulo: `${op.titulo} · ${idCorto(t.id)}`,
      texto: op.texto,
      campo: { etiqueta: op.campo, max: 500, inicial: clave === 'nota' ? t.notaDeAvance ?? '' : '' },
      textoConfirmar: op.confirmar,
      alConfirmar: async (valor) => {
        try {
          const { datos } = await op.llamar(t.id, valor)
          if (clave === 'resolver') {
            const notificacion = datos?.notificación ?? datos?.notificacion
            setAviso(avisoOk(`Ticket ${idCorto(t.id)} resuelto`, notificacion ? `Aviso al solicitante: ${notificacion}` : ''))
          } else if (clave === 'escalar') {
            setAviso(avisoOk(`Ticket ${idCorto(t.id)} escalado`, 'Salió de su tablero porque cambió de nivel.'))
          } else {
            setAviso(avisoOk('Nota guardada', `Ticket ${idCorto(t.id)}.`))
          }
        } catch (error) {
          // 403 o 409: el ticket pudo cambiar sin que nadie lo tocara. Se informa y se refresca.
          setAviso(avisoDeError(error))
        }
        setDialogo(null)
        recargar()
      },
    })
  }

  const fila = (t) => {
    const libre = t.tecnicoAsignadoId == null
    const mio = !libre && String(t.tecnicoAsignadoId) === String(perfil.id)
    const detalle = [t.descripción, t.notaDeAvance && `Última nota: ${t.notaDeAvance}`, t.motivoEscalamiento && `Motivo de escalamiento: ${t.motivoEscalamiento}`].filter(Boolean).join(' · ')
    let acciones = []
    if (libre) {
      acciones = [
        <button key="t" type="button" className="boton boton-primario boton-pequeno" disabled={ocupado.has(`tomar-${t.id}`)} onClick={() => tomar(t)}>
          {ocupado.has(`tomar-${t.id}`) ? 'Tomando…' : 'Tomar'}
        </button>,
      ]
    } else if (mio) {
      acciones = [
        <button key="n" type="button" className="boton boton-secundario boton-pequeno" onClick={() => abrirOperacion(t, 'nota')}>Nota</button>,
        // En Nivel3 no hay nivel superior: escalar respondería 409.
        t.nivelActual !== 'Nivel3' && (
          <button key="e" type="button" className="boton boton-secundario boton-pequeno" onClick={() => abrirOperacion(t, 'escalar')}>Escalar</button>
        ),
        <button key="r" type="button" className="boton boton-primario boton-pequeno" onClick={() => abrirOperacion(t, 'resolver')}>Resolver</button>,
      ].filter(Boolean)
    }
    return {
      clave: t.id,
      celdas: [
        <Celda key="n" fuerte texto={idCorto(t.id)} secundario={fecha(t.fechaCreación)} />,
        <Celda key="s" fuerte texto={t.dominio} secundario={detalle} />,
        <Etiqueta key="p" valor={t.prioridad} />,
        <Etiqueta key="e" valor={t.estado} />,
        atencionAntesDe(t),
        <Celda key="a" texto={mio ? 'Usted' : libre ? 'Sin asignar' : 'Otro técnico'} secundario={mio && t.fechaToma ? `Tomado ${fecha(t.fechaToma)}` : ''} />,
      ],
      acciones,
    }
  }

  const hayFiltros = Boolean(filtros.estado || filtros.prioridad)

  return (
    <Pagina antetitulo="Técnico de soporte" titulo="Tablero de soporte" descripcion={`${perfil.nombre ?? ''} · ${etiqueta(perfil.nivelDeServicio)}`} aviso={aviso} alCerrarAviso={() => setAviso(null)}>
      <Tarjeta
        titulo={`Tickets de ${etiqueta(perfil.nivelDeServicio)}`}
        nota="Orden del sistema: primero los rezagados, luego por prioridad y por SLA más antiguo. La lista se actualiza cada minuto: un ticket puede cambiar de estado o salir del tablero sin que nadie lo toque."
        acciones={
          <button type="button" className="boton boton-secundario" disabled={tablero.cargando} onClick={recargar}>
            {tablero.cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        }
      >
        <div className="acciones" style={{ alignItems: 'flex-end' }}>
          <div className="campo" style={{ flex: '0 1 220px' }}>
            <label htmlFor="filtro-estado">Estado</label>
            <select id="filtro-estado" className="entrada" value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos</option>
              {ESTADOS_DEL_TABLERO.map((e) => <option key={e} value={e}>{etiqueta(e)}</option>)}
            </select>
          </div>
          <div className="campo" style={{ flex: '0 1 220px' }}>
            <label htmlFor="filtro-prioridad">Prioridad</label>
            <select id="filtro-prioridad" className="entrada" value={filtros.prioridad} onChange={(e) => setFiltros((f) => ({ ...f, prioridad: e.target.value }))}>
              <option value="">Todas</option>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <ConDatos consulta={tablero}>
          {(lista) => (
            <Tabla
              etiqueta="Tickets del nivel"
              columnas={['Ticket', 'Sitio y detalle', 'Prioridad', 'Estado', 'Atención antes de', 'Asignación']}
              vacio={hayFiltros ? 'No hay tickets con esos filtros.' : 'No hay tickets pendientes en su nivel.'}
              filas={lista.map(fila)}
            />
          )}
        </ConDatos>
      </Tarjeta>
      {dialogo && <Dialogo {...dialogo} alCancelar={() => setDialogo(null)} />}
    </Pagina>
  )
}
