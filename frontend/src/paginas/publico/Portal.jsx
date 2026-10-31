import { Link } from 'react-router-dom'
import { INICIO_POR_TIPO, useSesion } from '../../api/sesion.js'

// UC0. No consulta la API ni publica precios: las tarifas de config/tarifas.js son de ejemplo.
export default function Portal() {
  const { perfil } = useSesion()

  return (
    <div className="portal">
      <section className="portal-heroe">
        <div>
          <span className="etiqueta tono-azul">Hosting y registro de dominios</span>
          <h1>Hosting y dominios para su sitio web.</h1>
          <p>
            ChibchaWeb aloja su sitio en uno de tres paquetes y tramita el registro de su dominio. Desde su cuenta
            solicita dominios, administra sus medios de pago, consulta comprobantes y abre tickets de soporte.
          </p>
          <div className="acciones">
            {perfil ? (
              <Link className="boton boton-primario boton-grande" to={INICIO_POR_TIPO[perfil.tipo]}>Ir a mi módulo</Link>
            ) : (
              <>
                <Link className="boton boton-primario boton-grande" to="/registro">Registrarme</Link>
                <Link className="boton boton-secundario boton-grande" to="/iniciar-sesion">Iniciar sesión</Link>
              </>
            )}
          </div>
        </div>
        <div className="portal-circulos" aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className="portal-seccion">
        <h2>Paquetes de hosting</h2>
        <p>Al registrarse elige un paquete y un plan de pago: mensual, trimestral, semestral o anual.</p>
        <div className="paquetes">
          {['Chibcha-Plata', 'Chibcha-Oro', 'Chibcha-Platino'].map((paquete, i) => (
            <article key={paquete} className="paquete">
              <span className={`acceso-numero ${['fondo-azul', 'fondo-rosa', 'fondo-vino'][i]}`} aria-hidden="true">{i + 1}</span>
              <p className="antetitulo" style={{ margin: 0 }}>Paquete</p>
              <h3>{paquete}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="portal-seccion">
        <h2>Desde su cuenta</h2>
        <div className="servicios">
          <div>
            <h4>Dominios</h4>
            <p>Solicite un dominio. ChibchaWeb genera la solicitud en XML y usted decide cuándo enviarla al registrador.</p>
          </div>
          <div>
            <h4>Pagos</h4>
            <p>Registre tarjetas Visa, Mastercard o Diners y consulte el historial de cobros con sus recibos.</p>
          </div>
          <div>
            <h4>Soporte</h4>
            <p>Abra tickets sobre sus sitios y siga su avance hasta la solución.</p>
          </div>
          <div>
            <h4>Cuentas</h4>
            <p>Los clientes se registran aquí. Distribuidores y personal reciben su cuenta de un administrador.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
