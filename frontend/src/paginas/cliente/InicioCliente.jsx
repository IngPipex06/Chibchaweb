import InicioTitular from '../../componentes/titular/InicioTitular.jsx'

const ACCESOS = [
  { titulo: 'Dominios', texto: 'Solicite un dominio y envíelo al registrador.', a: '/cliente/dominios' },
  { titulo: 'Pagos', texto: 'Medios de pago y comprobantes.', a: '/cliente/pagos' },
  { titulo: 'Soporte', texto: 'Abra tickets sobre sus sitios.', a: '/cliente/soporte' },
]

export default function InicioCliente() {
  return (
    <InicioTitular
      antetitulo="Cliente"
      descripcion="Sus sitios, sus dominios, sus pagos y su soporte."
      accesos={ACCESOS}
      tituloSitios="Sus sitios"
      vacioSitios="Todavía no tiene sitios. Cuando envíe una solicitud de dominio al registrador, el dominio aparecerá aquí."
    />
  )
}
