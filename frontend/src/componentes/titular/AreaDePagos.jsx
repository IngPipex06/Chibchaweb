import { pagos } from '../../api/servicios.js'
import { useDatos } from '../ganchos.js'
import { Accesos, ConDatos, Pagina, Tarjeta } from '../Interfaz.jsx'

// UC16. GET /api/pagos devuelve ["Métodos de pago", "Comprobantes"].
export default function AreaDePagos({ base }) {
  const opciones = useDatos(() => pagos.opciones())

  const destino = (nombre) =>
    /compro/i.test(nombre)
      ? { a: `${base}/pagos/comprobantes`, texto: 'Historial de cobros y recibos.' }
      : { a: `${base}/pagos/medios`, texto: 'Agregar, modificar o eliminar tarjetas.' }

  return (
    <Pagina antetitulo="Pagos" titulo="Área de pagos" descripcion="Administre sus tarjetas y consulte el historial de cobros.">
      <Tarjeta anchoMaximo="640px">
        <ConDatos consulta={opciones}>
          {(lista) => <Accesos items={(Array.isArray(lista) ? lista : []).map((nombre) => ({ titulo: nombre, ...destino(nombre) }))} />}
        </ConDatos>
      </Tarjeta>
    </Pagina>
  )
}
