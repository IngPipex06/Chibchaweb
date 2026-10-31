import { perfiles } from '../../api/servicios.js'
import { useSesion } from '../../api/sesion.js'
import { useDatos } from '../../componentes/ganchos.js'
import { Accesos, ConDatos, Ficha, Pagina, Tarjeta } from '../../componentes/Interfaz.jsx'
import { PERMISOS } from '../../componentes/valores.js'

const GESTIONES = {
  clientes: { titulo: 'Gestión de clientes', texto: 'Crear, editar, inhabilitar y reactivar clientes.', a: '/administrador/clientes' },
  personal: { titulo: 'Gestión de personal', texto: 'Administradores y técnicos de soporte.', a: '/administrador/personal' },
  distribuidores: { titulo: 'Gestión de distribuidores', texto: 'Perfiles y dominios asignados.', a: '/administrador/distribuidores' },
}

// UC5. GET /api/perfiles/gestiones devuelve una lista: ["clientes"], ["distribuidores"]…
export default function InicioAdministrador() {
  const { perfil } = useSesion()
  const gestiones = useDatos(() => perfiles.gestiones())
  const permisos = perfil.permisos ?? []

  const operaciones = []
  if (permisos.includes(PERMISOS.factura)) operaciones.push({ titulo: 'Facturación y cobros', texto: 'Generar facturas y ejecutar cobros.', a: '/administrador/facturacion' })
  if (permisos.includes(PERMISOS.cierre)) operaciones.push({ titulo: 'Cierre mensual', texto: 'Comisiones, cheques y categorías de distribuidores.', a: '/administrador/cierre' })
  if (permisos.includes(PERMISOS.migracion)) operaciones.push({ titulo: 'Migración', texto: 'Cargar datos de clientes legados.', a: '/administrador/migracion' })

  return (
    <Pagina antetitulo="Administrador" titulo={`Hola, ${String(perfil.nombre ?? perfil.correo).split(' ')[0]}`} descripcion={perfil.rol}>
      <Tarjeta mitad titulo="Gestiones">
        <ConDatos consulta={gestiones}>
          {(lista) => <Accesos items={(Array.isArray(lista) ? lista : []).filter((g) => GESTIONES[g]).map((g) => GESTIONES[g])} />}
        </ConDatos>
      </Tarjeta>
      <Tarjeta mitad titulo="Operaciones">
        <Accesos items={operaciones} />
      </Tarjeta>
      <Tarjeta titulo="Su cuenta">
        <Ficha pares={[['Nombre', perfil.nombre], ['Correo', perfil.correo], ['Rol', perfil.rol], ['Permisos', permisos.join(', '), true]]} />
      </Tarjeta>
    </Pagina>
  )
}
