import { useState } from 'react'
import { pagos } from '../../api/servicios.js'
import { avisoDeError, avisoOk, avisoPendiente } from '../avisos.js'
import { CAMPOS_DE_TARJETA, cuerpoDeTarjeta } from '../camposComunes.js'
import Dialogo from '../Dialogo.jsx'
import { fecha, soloFecha } from '../formato.js'
import Formulario from '../Formulario.jsx'
import { useDatos, useEnvio, useFormulario } from '../ganchos.js'
import { Celda, ConDatos, Pagina, Tabla, Tarjeta } from '../Interfaz.jsx'

// UC17 y UC8. El número completo nunca vuelve del backend ni se guarda en el navegador.
export default function MediosDePago() {
  const medios = useDatos(() => pagos.medios())
  const formulario = useFormulario()
  const [ocupado, ejecutar] = useEnvio()
  const [aviso, setAviso] = useState(null)
  const [edicion, setEdicion] = useState(null) // null | { id?, descripcion? }
  const [dialogo, setDialogo] = useState(null)

  const cerrarFormulario = () => {
    formulario.reiniciar()
    setEdicion(null)
  }

  const guardar = () =>
    ejecutar('guardar', async () => {
      if (!formulario.validar(CAMPOS_DE_TARJETA)) return
      const cuerpo = cuerpoDeTarjeta(formulario.valores)
      try {
        const r = edicion.id ? await pagos.modificarMedio(edicion.id, cuerpo) : await pagos.agregarMedio(cuerpo)
        if (r.pendiente) {
          setAviso({ ...avisoPendiente(r, 'El medio de pago todavía no aparece en la lista.'), titulo: 'Medio pendiente de conciliación' })
        } else {
          setAviso(avisoOk(edicion.id ? 'Tarjeta modificada' : 'Tarjeta agregada', r.datos?.numeroEnmascarado ? `${r.datos.tipoTarjeta ?? ''} ${r.datos.numeroEnmascarado} quedó activa.` : ''))
        }
        cerrarFormulario()
      } catch (error) {
        formulario.marcarError(error)
        setAviso(avisoDeError(error))
        // UC17 E1: se muestran todos los motivos y se vuelve a la lista.
        if (error.estado === 400 && error.errores.length) setEdicion(null)
      }
      // Modificar cambia el id: siempre se refresca la lista.
      medios.recargar()
    })

  const eliminar = (m) =>
    setDialogo({
      titulo: 'Eliminar tarjeta',
      texto: `Se eliminará ${m.tipoTarjeta} ${m.numeroEnmascarado}.`,
      textoConfirmar: 'Eliminar',
      alConfirmar: async () => {
        try {
          await pagos.eliminarMedio(m.id)
          setAviso(avisoOk('Tarjeta eliminada', `${m.tipoTarjeta} ${m.numeroEnmascarado} ya no está entre sus medios de pago.`))
        } catch (error) {
          setAviso(avisoDeError(error))
        }
        setDialogo(null)
        medios.recargar()
      },
    })

  return (
    <Pagina
      antetitulo="Pagos"
      titulo="Medios de pago"
      descripcion="Los datos de la tarjeta no se guardan en el navegador y nunca se muestran completos."
      aviso={aviso}
      alCerrarAviso={() => setAviso(null)}
    >
      {edicion && (
        <Tarjeta
          mitad
          titulo={edicion.id ? `Modificar ${edicion.descripcion}` : 'Agregar tarjeta'}
          nota={edicion.id ? 'El número completo no se conserva: reingréselo. Al guardar, la tarjeta recibe un identificador nuevo.' : 'El número debe corresponder a la franquicia elegida.'}
        >
          <Formulario
            campos={CAMPOS_DE_TARJETA}
            formulario={formulario}
            alEnviar={guardar}
            enviando={ocupado.has('guardar')}
            textoEnviar={edicion.id ? 'Guardar cambios' : 'Agregar tarjeta'}
            textoEnviando="Guardando…"
            alCancelar={cerrarFormulario}
          />
        </Tarjeta>
      )}
      <Tarjeta
        mitad={Boolean(edicion)}
        titulo="Tarjetas activas"
        acciones={
          !edicion && (
            <button type="button" className="boton boton-primario" onClick={() => { formulario.reiniciar(); setEdicion({}) }}>
              Agregar tarjeta
            </button>
          )
        }
      >
        <ConDatos consulta={medios}>
          {(lista) => (
            <Tabla
              etiqueta="Tarjetas activas"
              columnas={['Franquicia', 'Número', 'Vence']}
              vacio="No tiene medios de pago registrados."
              filas={lista.map((m) => ({
                clave: m.id,
                celdas: [<Celda key="f" fuerte texto={m.tipoTarjeta} />, m.numeroEnmascarado, fecha(soloFecha(m.fechaExpiración))],
                acciones: [
                  <button key="mod" type="button" className="boton boton-secundario boton-pequeno" onClick={() => {
                    formulario.reiniciar({ franquicia: m.tipoTarjeta, fechaExpiración: soloFecha(m.fechaExpiración) })
                    setEdicion({ id: m.id, descripcion: `${m.tipoTarjeta} ${m.numeroEnmascarado}` })
                  }}>Modificar</button>,
                  <button key="eli" type="button" className="boton boton-secundario boton-pequeno" onClick={() => eliminar(m)}>Eliminar</button>,
                ],
              }))}
            />
          )}
        </ConDatos>
      </Tarjeta>
      {dialogo && <Dialogo {...dialogo} alCancelar={() => setDialogo(null)} />}
    </Pagina>
  )
}
