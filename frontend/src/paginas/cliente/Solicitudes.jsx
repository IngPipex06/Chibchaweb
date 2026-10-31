import { useState } from 'react'
import { solicitudes } from '../../api/servicios.js'
import { avisoDeError, avisoOk, avisoPendiente } from '../../componentes/avisos.js'
import { fecha } from '../../componentes/formato.js'
import Formulario from '../../componentes/Formulario.jsx'
import { useDatos, useEnvio, useFormulario } from '../../componentes/ganchos.js'
import { Celda, ConDatos, Etiqueta, Ficha, Pagina, Tabla, Tarjeta } from '../../componentes/Interfaz.jsx'

const CAMPOS = [
  { nombre: 'nombreDominioSolicitado', etiqueta: 'Dominio', obligatorio: true, formato: 'dominio', completo: true, marcador: 'misitio.com', ayuda: 'Los datos del solicitante se toman de su perfil.' },
]

// UC19, UC20 y UC21. Solo el Cliente.
export default function Solicitudes() {
  const lista = useDatos(() => solicitudes.listar())
  const formulario = useFormulario()
  const [ocupado, ejecutar] = useEnvio()
  const [aviso, setAviso] = useState(null)
  const [seleccionada, setSeleccionada] = useState(null)
  const [versionDelDetalle, setVersionDelDetalle] = useState(0)

  const crear = () =>
    ejecutar('crear', async () => {
      if (!formulario.validar(CAMPOS)) return
      const dominio = formulario.valores.nombreDominioSolicitado.trim()
      try {
        const r = await solicitudes.crear(dominio)
        if (r.pendiente) return setAviso(avisoPendiente(r))
        setAviso(avisoOk(`Solicitud de ${dominio} generada`, 'Quedó en estado Generada con su XML listo. Puede descargar el XML o enviarla al registrador.'))
        formulario.reiniciar()
        lista.recargar()
      } catch (error) {
        formulario.marcarError(error)
        setAviso(avisoDeError(error))
      }
    })

  // Enviar es opcional y aparte. Un 502 deja la solicitud Generada.
  const enviar = (s) =>
    ejecutar(`enviar-${s.id}`, async () => {
      try {
        const { datos } = await solicitudes.enviar(s.id)
        setAviso(avisoOk('Solicitud enviada al registrador', [datos?.mensaje, `${s.nombreDominioSolicitado} ya figura en sus sitios.`].filter(Boolean).join(' ')))
      } catch (error) {
        setAviso(avisoDeError(error))
      }
      lista.recargar()
      setVersionDelDetalle((v) => v + 1)
    })

  const descargarXml = (s) =>
    ejecutar(`xml-${s.id}`, async () => {
      try {
        await solicitudes.descargarXml(s.id)
      } catch (error) {
        setAviso(avisoDeError(error))
      }
    })

  const acciones = (s, enDetalle = false) =>
    [
      !enDetalle && (
        <button key="ver" type="button" className="boton boton-secundario boton-pequeno" onClick={() => setSeleccionada(s.id)}>Detalle</button>
      ),
      <button key="xml" type="button" className={`boton boton-secundario${enDetalle ? '' : ' boton-pequeno'}`} disabled={ocupado.has(`xml-${s.id}`)} onClick={() => descargarXml(s)}>
        {ocupado.has(`xml-${s.id}`) ? 'Descargando…' : 'XML'}
      </button>,
      // Una solicitud Enviada no se vuelve a enviar.
      s.estado === 'Generada' && (
        <button key="env" type="button" className={`boton boton-primario${enDetalle ? '' : ' boton-pequeno'}`} disabled={ocupado.has(`enviar-${s.id}`)} onClick={() => enviar(s)}>
          {ocupado.has(`enviar-${s.id}`) ? 'Enviando…' : 'Enviar al registrador'}
        </button>
      ),
    ].filter(Boolean)

  return (
    <Pagina antetitulo="Cliente" titulo="Solicitudes de dominio" descripcion="Al enviarse una solicitud, el dominio queda a su nombre y aparece en sus sitios." aviso={aviso} alCerrarAviso={() => setAviso(null)}>
      <Tarjeta mitad titulo="Nueva solicitud" nota="Crear la solicitud la deja Generada y con su XML listo. Enviarla al registrador es un paso aparte y opcional.">
        <Formulario campos={CAMPOS} formulario={formulario} alEnviar={crear} enviando={ocupado.has('crear')} textoEnviar="Generar solicitud" textoEnviando="Generando…" />
      </Tarjeta>
      {seleccionada && <DetalleDeSolicitud key={`${seleccionada}-${versionDelDetalle}`} id={seleccionada} acciones={acciones} alCerrar={() => setSeleccionada(null)} />}
      <Tarjeta titulo="Sus solicitudes" acciones={<button type="button" className="boton boton-secundario" onClick={lista.recargar}>Actualizar</button>}>
        <ConDatos consulta={lista}>
          {(datos) => (
            <Tabla
              etiqueta="Sus solicitudes"
              columnas={['Dominio', 'Estado', 'Fecha', 'Formato XML']}
              vacio="Aún no ha creado solicitudes de dominio."
              filas={datos.map((s) => ({
                clave: s.id,
                celdas: [<Celda key="d" fuerte texto={s.nombreDominioSolicitado} />, <Etiqueta key="e" valor={s.estado} />, fecha(s.fechaSolicitud), s.formatoVersionXml ?? 'Sin dato'],
                acciones: acciones(s),
              }))}
            />
          )}
        </ConDatos>
      </Tarjeta>
    </Pagina>
  )
}

function DetalleDeSolicitud({ id, acciones, alCerrar }) {
  const consulta = useDatos(() => solicitudes.obtener(id), [id])
  return (
    <Tarjeta mitad antetitulo="Solicitud" titulo={consulta.datos?.nombreDominioSolicitado ?? 'Detalle'}>
      <ConDatos consulta={consulta}>
        {(s) => (
          <>
            <Ficha pares={[
              ['Estado', <Etiqueta key="e" valor={s.estado} />],
              ['Fecha', fecha(s.fechaSolicitud)],
              ['Formato XML', s.formatoVersionXml],
              ['Dominio creado', s.dominioId ? 'Sí' : 'Aún no'],
            ]} />
            <div className="acciones">
              {acciones(s, true)}
              <button type="button" className="boton boton-fantasma" onClick={alCerrar}>Cerrar</button>
            </div>
          </>
        )}
      </ConDatos>
    </Tarjeta>
  )
}
