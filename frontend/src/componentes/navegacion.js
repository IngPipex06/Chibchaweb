import { PERMISOS } from './valores.js'

// Menú por rol: nadie ve opciones que su rol no puede usar.
// [etiqueta, ruta, exacta]
export function enlacesDelMenu(perfil) {
  if (!perfil) return []
  if (perfil.tipo === 'Cliente') {
    return [['Inicio', '/cliente', true], ['Dominios', '/cliente/dominios', true], ['Pagos', '/cliente/pagos', false], ['Soporte', '/cliente/soporte', true]]
  }
  if (perfil.tipo === 'Distribuidor') {
    return [['Inicio', '/distribuidor', true], ['Pagos', '/distribuidor/pagos', false], ['Soporte', '/distribuidor/soporte', true]]
  }
  if (perfil.tipo === 'TécnicoDeSoporte') return [['Tablero', '/tecnico', true]]

  const permisos = perfil.permisos ?? []
  const enlaces = [['Inicio', '/administrador', true]]
  if (permisos.includes(PERMISOS.clientes)) enlaces.push(['Clientes', '/administrador/clientes', true])
  if (permisos.includes(PERMISOS.personal)) enlaces.push(['Personal', '/administrador/personal', true])
  if (permisos.includes(PERMISOS.distribuidores)) enlaces.push(['Distribuidores', '/administrador/distribuidores', true])
  if (permisos.includes(PERMISOS.factura)) enlaces.push(['Facturación', '/administrador/facturacion', true])
  if (permisos.includes(PERMISOS.cierre)) enlaces.push(['Cierre', '/administrador/cierre', true])
  if (permisos.includes(PERMISOS.migracion)) enlaces.push(['Migración', '/administrador/migracion', true])
  return enlaces
}
