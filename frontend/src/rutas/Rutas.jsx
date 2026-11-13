import { Navigate, Route, Routes } from 'react-router-dom'
import AreaDePagos from '../componentes/titular/AreaDePagos.jsx'
import Comprobantes from '../componentes/titular/Comprobantes.jsx'
import MediosDePago from '../componentes/titular/MediosDePago.jsx'
import Soporte from '../componentes/titular/Soporte.jsx'
import { PERMISOS } from '../componentes/valores.js'
import CierreMensual from '../paginas/administrador/CierreMensual.jsx'
import Facturacion from '../paginas/administrador/Facturacion.jsx'
import GestionDePerfiles from '../paginas/administrador/GestionDePerfiles.jsx'
import InicioAdministrador from '../paginas/administrador/InicioAdministrador.jsx'
import Migracion from '../paginas/administrador/Migracion.jsx'
import InicioCliente from '../paginas/cliente/InicioCliente.jsx'
import Solicitudes from '../paginas/cliente/Solicitudes.jsx'
import InicioDistribuidor from '../paginas/distribuidor/InicioDistribuidor.jsx'
import InicioSesion from '../paginas/publico/InicioSesion.jsx'
import Portal from '../paginas/publico/Portal.jsx'
import RecuperarContrasena from '../paginas/publico/RecuperarContrasena.jsx'
import Registro from '../paginas/publico/Registro.jsx'
import Tablero from '../paginas/tecnico/Tablero.jsx'
import { RutaProtegida, SoloSinSesion } from './Proteccion.jsx'

// Pagos y soporte se comparten entre Cliente y Distribuidor: el código está en
// componentes/titular/ y cada rol solo decide qué monta y bajo qué ruta.
function rutasDeTitular(base, esCliente) {
  return (
    <>
      <Route path="pagos" element={<AreaDePagos base={base} />} />
      <Route path="pagos/medios" element={<MediosDePago />} />
      <Route path="pagos/comprobantes" element={<Comprobantes />} />
      <Route path="soporte" element={<Soporte esCliente={esCliente} base={base} />} />
    </>
  )
}

const ADMINISTRADOR = ['Administrador']
const conPermiso = (permiso, pagina) => <RutaProtegida tipos={ADMINISTRADOR} permiso={permiso}>{pagina}</RutaProtegida>

export default function Rutas() {
  return (
    <Routes>
      <Route path="/" element={<Portal />} />
      <Route element={<SoloSinSesion />}>
        <Route path="/registro" element={<Registro />} />
        <Route path="/iniciar-sesion" element={<InicioSesion />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
      </Route>

      <Route path="/cliente" element={<RutaProtegida tipos={['Cliente']} />}>
        <Route index element={<InicioCliente />} />
        <Route path="dominios" element={<Solicitudes />} />
        {rutasDeTitular('/cliente', true)}
      </Route>

      <Route path="/distribuidor" element={<RutaProtegida tipos={['Distribuidor']} />}>
        <Route index element={<InicioDistribuidor />} />
        {rutasDeTitular('/distribuidor', false)}
      </Route>

      <Route path="/administrador" element={<RutaProtegida tipos={ADMINISTRADOR} />}>
        <Route index element={<InicioAdministrador />} />
        <Route path="clientes" element={conPermiso(PERMISOS.clientes, <GestionDePerfiles key="clientes" tipo="clientes" />)} />
        <Route path="personal" element={conPermiso(PERMISOS.personal, <GestionDePerfiles key="personal" tipo="personal" />)} />
        <Route path="distribuidores" element={conPermiso(PERMISOS.distribuidores, <GestionDePerfiles key="distribuidores" tipo="distribuidores" />)} />
        <Route path="facturacion" element={conPermiso(PERMISOS.factura, <Facturacion />)} />
        <Route path="cierre" element={conPermiso(PERMISOS.cierre, <CierreMensual />)} />
        <Route path="migracion" element={conPermiso(PERMISOS.migracion, <Migracion />)} />
      </Route>

      <Route path="/tecnico" element={<RutaProtegida tipos={['TécnicoDeSoporte']} />}>
        <Route index element={<Tablero />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
