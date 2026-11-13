import { useState } from 'react'
import { pagos } from '../../api/servicios.js'
import { avisoDeError } from '../avisos.js'
import { fecha, monto, numeroDeFactura } from '../formato.js'
import { useDatos, useEnvio } from '../ganchos.js'
import { Celda, ConDatos, Etiqueta, Ficha, Pagina, Tabla, Tarjeta } from '../Interfaz.jsx'

// UC18. Solo los cobros Exitoso tienen recibo.
export default function Comprobantes() {
  const lista = useDatos(() => pagos.comprobantes())
  const [seleccionado, setSeleccionado] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [ocupado, ejecutar] = useEnvio()

  const descargarRecibo = (c) =>
    ejecutar(`recibo-${c.id}`, async () => {
      try {
        await pagos.descargarRecibo(c.id)
      } catch (error) {
        setAviso(avisoDeError(error))
      }
    })

  const botonRecibo = (c, primario) =>
    c.estado === 'Exitoso' && (
      <button key="rec" type="button" className={`boton ${primario ? 'boton-primario' : 'boton-secundario boton-pequeno'}`} disabled={ocupado.has(`recibo-${c.id}`)} onClick={() => descargarRecibo(c)}>
        {ocupado.has(`recibo-${c.id}`) ? 'Descargando…' : 'Recibo PDF'}
      </button>
    )

  return (
    <Pagina antetitulo="Pagos" titulo="Comprobantes" aviso={aviso} alCerrarAviso={() => setAviso(null)}>
      {seleccionado && <DetalleDeComprobante key={seleccionado} id={seleccionado} botonRecibo={botonRecibo} alCerrar={() => setSeleccionado(null)} />}
      <Tarjeta titulo="Historial de cobros" nota="Incluye cobros exitosos y fallidos. Solo los exitosos tienen recibo.">
        <ConDatos consulta={lista}>
          {(datos) => (
            <Tabla
              etiqueta="Historial de cobros"
              columnas={['Fecha', 'Período', 'Factura', 'Monto', 'Tarjeta', 'Estado']}
              vacio="No hay historial de cobros."
              filas={datos.map((c) => ({
                clave: c.id,
                celdas: [fecha(c.fecha), c.período ?? 'Sin dato', numeroDeFactura(c.factura), <Celda key="m" fuerte texto={monto(c.monto)} />, `${c.tipoTarjeta ?? ''} ${c.numeroEnmascarado ?? ''}`.trim() || 'Sin dato', <Etiqueta key="e" valor={c.estado} />],
                acciones: [
                  <button key="det" type="button" className="boton boton-secundario boton-pequeno" onClick={() => setSeleccionado(c.id)}>Detalle</button>,
                  botonRecibo(c, false),
                ].filter(Boolean),
              }))}
            />
          )}
        </ConDatos>
      </Tarjeta>
    </Pagina>
  )
}

function DetalleDeComprobante({ id, botonRecibo, alCerrar }) {
  const consulta = useDatos(() => pagos.comprobante(id), [id])
  return (
    <Tarjeta antetitulo="Detalle del cobro" titulo={consulta.datos ? monto(consulta.datos.monto) : 'Cobro'}>
      <ConDatos consulta={consulta}>
        {(c) => (
          <>
            <Ficha pares={[
              ['Estado', <Etiqueta key="e" valor={c.estado} />],
              ['Fecha', fecha(c.fecha)],
              ['Período', c.período],
              ['Factura', numeroDeFactura(c.factura)],
              ['Tarjeta', `${c.tipoTarjeta ?? ''} ${c.numeroEnmascarado ?? ''}`.trim()],
            ]} />
            <div className="acciones">
              {botonRecibo(c, true)}
              <button type="button" className="boton boton-fantasma" onClick={alCerrar}>Cerrar</button>
            </div>
          </>
        )}
      </ConDatos>
    </Tarjeta>
  )
}
