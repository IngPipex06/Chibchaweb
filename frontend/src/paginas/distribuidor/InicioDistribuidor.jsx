import InicioTitular from '../../componentes/titular/InicioTitular.jsx'

const ACCESOS = [
  { titulo: 'Pagos', texto: 'Medios de pago y comprobantes.', a: '/distribuidor/pagos' },
  { titulo: 'Soporte', texto: 'Abra tickets sobre sus dominios.', a: '/distribuidor/soporte' },
]

// Las solicitudes de dominio son solo del Cliente (hueco 9): no hay página aquí.
export default function InicioDistribuidor() {
  return (
    <InicioTitular
      antetitulo="Distribuidor"
      descripcion="Sus dominios gestionados, sus pagos y su soporte."
      accesos={ACCESOS}
      tituloSitios="Dominios gestionados"
      notaSitios="Los asigna el Administrador de Canales. Ni los dominios ni la categoría se cambian desde aquí."
      vacioSitios="Todavía no tiene dominios asignados."
    />
  )
}
