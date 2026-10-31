import { descargar, pedir } from './http.js'

const consulta = (parametros) => {
  const texto = new URLSearchParams(Object.entries(parametros).filter(([, valor]) => valor)).toString()
  return texto ? `?${texto}` : ''
}
const enRuta = encodeURIComponent

export const usuarios = {
  registrar: (datos) => pedir('POST', '/usuarios/registro', { cuerpo: datos, publico: true }),
  iniciarSesion: (correo, contraseña) => pedir('POST', '/usuarios/sesion', { cuerpo: { correo, contraseña }, publico: true }),
  pregunta: (correo) => pedir('POST', '/usuarios/recuperacion/pregunta', { cuerpo: { correo }, publico: true }),
  recuperar: (datos) => pedir('POST', '/usuarios/recuperacion', { cuerpo: datos, publico: true }),
  perfil: () => pedir('GET', '/usuarios/perfil'),
}

const gestion = (base) => ({
  listar: (buscar) => pedir('GET', base + consulta({ buscar })),
  obtener: (id) => pedir('GET', `${base}/${enRuta(id)}`),
  crear: (datos) => pedir('POST', base, { cuerpo: datos }),
  editar: (id, datos) => pedir('PUT', `${base}/${enRuta(id)}`, { cuerpo: datos }),
  inhabilitar: (id) => pedir('POST', `${base}/${enRuta(id)}/inhabilitar`),
})

export const perfiles = {
  gestiones: () => pedir('GET', '/perfiles/gestiones'),
  clientes: {
    ...gestion('/perfiles/clientes'),
    reactivar: (id) => pedir('POST', `/perfiles/clientes/${enRuta(id)}/reactivar`),
  },
  personal: gestion('/perfiles/personal'),
  distribuidores: {
    ...gestion('/perfiles/distribuidores'),
    dominios: (id) => pedir('GET', `/perfiles/distribuidores/${enRuta(id)}/dominios`),
    asignarDominio: (id, nombre) => pedir('POST', `/perfiles/distribuidores/${enRuta(id)}/dominios`, { cuerpo: { nombre } }),
    quitarDominio: (id, nombre) => pedir('DELETE', `/perfiles/distribuidores/${enRuta(id)}/dominios/${enRuta(nombre)}`),
  },
}

export const solicitudes = {
  listar: () => pedir('GET', '/solicitudes'),
  obtener: (id) => pedir('GET', `/solicitudes/${enRuta(id)}`),
  crear: (nombreDominioSolicitado) => pedir('POST', '/solicitudes', { cuerpo: { nombreDominioSolicitado } }),
  enviar: (id) => pedir('POST', `/solicitudes/${enRuta(id)}/envio`),
  descargarXml: (id) => descargar(`/solicitudes/${enRuta(id)}/xml`, `solicitud-${id}.xml`),
}

export const pagos = {
  opciones: () => pedir('GET', '/pagos'),
  medios: () => pedir('GET', '/pagos/medios'),
  agregarMedio: (datos) => pedir('POST', '/pagos/medios', { cuerpo: datos }),
  modificarMedio: (id, datos) => pedir('PUT', `/pagos/medios/${enRuta(id)}`, { cuerpo: datos }),
  eliminarMedio: (id) => pedir('DELETE', `/pagos/medios/${enRuta(id)}`),
  comprobantes: () => pedir('GET', '/pagos/comprobantes'),
  comprobante: (id) => pedir('GET', `/pagos/comprobantes/${enRuta(id)}`),
  descargarRecibo: (id) => descargar(`/pagos/comprobantes/${enRuta(id)}/recibo`, `comprobante-${id}.pdf`),
  ejecutarCobros: () => pedir('POST', '/pagos/cobros'),
}

export const soporte = {
  sitios: () => pedir('GET', '/soporte/sitios'),
  tickets: () => pedir('GET', '/soporte/tickets'),
  abrirTicket: (datos) => pedir('POST', '/soporte/tickets', { cuerpo: datos }),
  tablero: (filtros) => pedir('GET', '/soporte/tablero' + consulta(filtros)),
  tomar: (id) => pedir('POST', `/soporte/tickets/${enRuta(id)}/toma`),
  resolver: (id, solución) => pedir('POST', `/soporte/tickets/${enRuta(id)}/resolucion`, { cuerpo: { solución } }),
  escalar: (id, motivo) => pedir('POST', `/soporte/tickets/${enRuta(id)}/escalamiento`, { cuerpo: { motivo } }),
  anotar: (id, nota) => pedir('PUT', `/soporte/tickets/${enRuta(id)}/nota`, { cuerpo: { nota } }),
}

export const facturacion = {
  generarFactura: (titularId, período) => pedir('POST', '/facturacion/facturas', { cuerpo: { titularId, período } }),
  ejecutarCierre: (período) => pedir('POST', '/facturacion/cierres', { cuerpo: { período } }),
  descargarCheque: (id) => descargar(`/facturacion/cheques/${enRuta(id)}/pdf`, `cheque-${id}.pdf`),
}

export const migraciones = {
  iniciar: (nombreArchivo, texto) => pedir('POST', '/migraciones' + consulta({ nombreArchivo }), { csv: texto }),
  pausar: (id) => pedir('POST', `/migraciones/${enRuta(id)}/pausar`),
  reanudar: (id, texto) => pedir('POST', `/migraciones/${enRuta(id)}/reanudar`, { csv: texto }),
  reporte: (id) => pedir('GET', `/migraciones/${enRuta(id)}/inconsistencias`),
}
