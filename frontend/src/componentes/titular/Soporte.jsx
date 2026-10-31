import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { soporte } from '../../api/servicios.js'
import { avisoDeError, avisoOk } from '../avisos.js'
import { atencionAntesDe, fecha, idCorto } from '../formato.js'
import Formulario from '../Formulario.jsx'
import { useDatos, useEnvio, useFormulario } from '../ganchos.js'
import { Aviso, Celda, ConDatos, Etiqueta, Pagina, Tabla, Tarjeta } from '../Interfaz.jsx'
import { PRIORIDADES, etiqueta } from '../valores.js'

// UC22. No hay correo ni avisos guardados: el titular ve la solución en sus tickets.
export default function Soporte({ esCliente, base }) {
  const navegar = useNavigate()
  const sitios = useDatos(() => soporte.sitios())
  const tickets = useDatos(() => soporte.tickets())
  const formulario = useFormulario()
  const [ocupado, ejecutar] = useEnvio()
  const [aviso, setAviso] = useState(null)

  const listaDeSitios = Array.isArray(sitios.datos) ? sitios.datos : []
  const campos = [
    { nombre: 'dominioId', etiqueta: 'Sitio', tipo: 'seleccion', obligatorio: true, completo: true, marcador: 'Seleccione un sitio', opciones: listaDeSitios.map((s) => ({ valor: String(s.id), etiqueta: s.nombre })) },
    { nombre: 'prioridad', etiqueta: 'Prioridad', tipo: 'opciones', opciones: PRIORIDADES, obligatorio: true, completo: true, ayuda: 'Plazo de atención: Alta 2 horas, Media 24 horas, Baja 48 horas.' },
    { nombre: 'descripción', etiqueta: 'Descripción del problema', tipo: 'area', obligatorio: true, max: 500, completo: true },
  ]

  const abrir = () =>
    ejecutar('abrir', async () => {
      if (!formulario.validar(campos)) return
      const v = formulario.valores
      const sitio = listaDeSitios.find((s) => String(s.id) === v.dominioId)
      try {
        const { datos } = await soporte.abrirTicket({ dominioId: sitio?.id ?? v.dominioId, descripción: v.descripción.trim(), prioridad: v.prioridad })
        // UC22 paso 11: se muestra el número de ticket.
        setAviso(avisoOk(`Ticket ${datos?.id ?? ''} creado`, 'Quedó Abierto en Nivel 1. La solución aparecerá en la lista de sus tickets.'))
        formulario.reiniciar()
        tickets.recargar()
      } catch (error) {
        formulario.marcarError(error)
        setAviso(avisoDeError(error))
      }
    })

  let bloqueDeApertura
  if (sitios.datos === undefined) {
    bloqueDeApertura = <Tarjeta mitad titulo="Abrir ticket"><ConDatos consulta={sitios}>{() => null}</ConDatos></Tarjeta>
  } else if (!listaDeSitios.length) {
    bloqueDeApertura = (
      <Aviso
        tipo="info"
        titulo="Todavía no puede abrir tickets"
        texto={`Un ticket se abre sobre uno de sus sitios y su cuenta aún no tiene ninguno.${esCliente ? ' Puede solicitar un dominio en la página de Dominios.' : ' Sus dominios los asigna el Administrador de Canales.'}`}
        acciones={esCliente ? [{ etiqueta: 'Ir a Dominios', alHacer: () => navegar(`${base}/dominios`) }] : []}
      />
    )
  } else {
    bloqueDeApertura = (
      <Tarjeta mitad titulo="Abrir ticket">
        <Formulario campos={campos} formulario={formulario} alEnviar={abrir} enviando={ocupado.has('abrir')} textoEnviar="Abrir ticket" textoEnviando="Abriendo…" />
      </Tarjeta>
    )
  }

  return (
    <Pagina antetitulo={esCliente ? 'Cliente' : 'Distribuidor'} titulo="Soporte" descripcion="Cuando un técnico resuelve su ticket, la solución aparece en esta lista." aviso={aviso} alCerrarAviso={() => setAviso(null)}>
      {bloqueDeApertura}
      <Tarjeta
        titulo="Sus tickets"
        nota="La hora de atención se calcula con el inicio del SLA más el plazo de la prioridad. Es informativa: el sistema decide cuándo vence un ticket."
        acciones={<button type="button" className="boton boton-secundario" disabled={tickets.cargando} onClick={tickets.recargar}>{tickets.cargando ? 'Actualizando…' : 'Actualizar'}</button>}
      >
        <ConDatos consulta={tickets}>
          {(lista) => (
            <Tabla
              etiqueta="Sus tickets"
              columnas={['Ticket', 'Sitio', 'Prioridad', 'Estado', 'Nivel', 'Atención antes de', 'Solución']}
              vacio="No ha abierto tickets."
              filas={lista.map((t) => ({
                clave: t.id,
                celdas: [
                  <Celda key="n" fuerte texto={idCorto(t.id)} secundario={fecha(t.fechaCreación)} />,
                  <Celda key="s" texto={t.dominio} secundario={t.descripción} />,
                  <Etiqueta key="p" valor={t.prioridad} />,
                  <Etiqueta key="e" valor={t.estado} />,
                  etiqueta(t.nivelActual),
                  t.estado === 'Resuelto' ? 'No aplica' : atencionAntesDe(t),
                  t.solución || (t.estado === 'Resuelto' ? 'Sin dato' : 'Pendiente'),
                ],
              }))}
            />
          )}
        </ConDatos>
      </Tarjeta>
    </Pagina>
  )
}
