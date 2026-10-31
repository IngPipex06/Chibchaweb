import { useState } from 'react'
import { facturacion } from '../../api/servicios.js'
import { avisoDeError } from '../../componentes/avisos.js'
import Dialogo from '../../componentes/Dialogo.jsx'
import { cantidad, monto } from '../../componentes/formato.js'
import Formulario from '../../componentes/Formulario.jsx'
import { useEnvio, useFormulario } from '../../componentes/ganchos.js'
import { Aviso, Cargando, Celda, Etiqueta, Pagina, Resumen, Tabla, Tarjeta } from '../../componentes/Interfaz.jsx'

const CAMPOS = [{ nombre: 'período', etiqueta: 'Período', tipo: 'mes', obligatorio: true, formato: 'periodo', marcador: 'AAAA-MM', completo: true, ayuda: 'Solo se cierran meses que ya terminaron.' }]

// UC12 a UC15. El resultado solo llega al ejecutar (hueco 4).
export default function CierreMensual() {
  const formulario = useFormulario()
  const [ocupado, ejecutar] = useEnvio()
  const [aviso, setAviso] = useState(null)
  const [cierre, setCierre] = useState(null)
  const [dialogo, setDialogo] = useState(null)

  // Mientras corre, no se puede enviar dos veces.
  const cerrar = (período) =>
    ejecutar('cierre', async () => {
      try {
        const { datos } = await facturacion.ejecutarCierre(período)
        setAviso(null)
        setCierre(datos)
      } catch (error) {
        // 400 el mes no ha terminado; 409 ya cerrado o en curso.
        formulario.marcarError(error)
        setAviso(avisoDeError(error))
      }
    })

  const confirmar = () => {
    if (!formulario.validar(CAMPOS)) return
    const período = formulario.valores.período
    setDialogo({ titulo: `Cerrar ${período}`, texto: 'Un mes cerrado no se puede volver a cerrar.', textoConfirmar: 'Ejecutar cierre', alConfirmar: () => { setDialogo(null); cerrar(período) } })
  }

  const descargarCheque = (chequeId) =>
    ejecutar(`cheque-${chequeId}`, async () => {
      try {
        await facturacion.descargarCheque(chequeId)
      } catch (error) {
        setAviso(avisoDeError(error))
      }
    })

  return (
    <Pagina antetitulo="Administrador" titulo="Cierre mensual" aviso={aviso} alCerrarAviso={() => setAviso(null)}>
      <Tarjeta mitad titulo="Ejecutar cierre" nota="Procesa a cada distribuidor del período: comisión, cheque y revisión de categoría.">
        <Formulario campos={CAMPOS} formulario={formulario} alEnviar={confirmar} enviando={ocupado.has('cierre')} textoEnviar="Ejecutar cierre" textoEnviando="Ejecutando cierre…" />
        {ocupado.has('cierre') && <Cargando texto="El cierre está en curso…" />}
      </Tarjeta>
      {cierre && (
        <>
          <Tarjeta titulo={`Cierre de ${cierre.período}`}>
            <Resumen items={[['Distribuidores procesados', cantidad(cierre.distribuidoresProcesados)], ['Cheques generados', cantidad(cierre.chequesGenerados)], ['Cambios de categoría', cantidad(cierre.cambiosDeCategoría)]]} />
          </Tarjeta>
          <Aviso tipo="critico" titulo="Descargue los cheques ahora" texto="El sistema no ofrece una consulta posterior de cierres ni de cheques, y repetir el cierre responde que el mes ya está cerrado." />
          <Tarjeta titulo="Resultado por distribuidor">
            <Tabla
              etiqueta="Resultado por distribuidor"
              columnas={['Distribuidor', 'Categoría', 'Comisión', 'Novedad']}
              vacio="No hubo distribuidores para procesar."
              filas={(cierre.resultados ?? []).map((r) => ({
                clave: r.distribuidorId,
                celdas: [
                  <Celda key="d" fuerte texto={r.razónSocial} />,
                  <Etiqueta key="c" valor={r.categoría} />,
                  monto(r.comisión),
                  r.sinFacturación ? (
                    <Celda key="n" texto={<Etiqueta valor="sinFacturación" texto="Sin facturación" />} secundario={r.aviso} />
                  ) : (
                    r.aviso || 'Sin dato'
                  ),
                ],
                acciones: r.chequeId
                  ? [
                      <button key="ch" type="button" className="boton boton-primario boton-pequeno" disabled={ocupado.has(`cheque-${r.chequeId}`)} onClick={() => descargarCheque(r.chequeId)}>
                        {ocupado.has(`cheque-${r.chequeId}`) ? 'Descargando…' : 'Cheque PDF'}
                      </button>,
                    ]
                  : [],
              }))}
            />
          </Tarjeta>
        </>
      )}
      {dialogo && <Dialogo {...dialogo} alCancelar={() => setDialogo(null)} />}
    </Pagina>
  )
}
