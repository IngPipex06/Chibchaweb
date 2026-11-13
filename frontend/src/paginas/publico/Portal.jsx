import { Link } from 'react-router-dom'
import { INICIO_POR_TIPO, useSesion } from '../../api/sesion.js'
import cwLogo from '../../assets/CWLogo.jpg'

// UC0. No consulta la API ni publica precios: las tarifas de config/tarifas.js son de ejemplo.
export default function Portal() {
  const { perfil } = useSesion()

  return (
    <div className="portal">
      {/* Hero Section */}
      <section className="portal-heroe">
        <div className="portal-heroe-contenido">
          <div className="insignia-dorada">
            <img src="/tunjoLogo.svg" alt="" className="insignia-dorada-icono" />
            <span>Infraestructura web de alta fidelidad</span>
          </div>
          <h1>
            Hosting y dominios con el poder del <span className="texto-dorado">Oro Chibcha</span>.
          </h1>
          <p className="portal-descripcion">
            ChibchaWeb aloja su sitio en uno de tres prestigiosos paquetes y tramita el registro de su dominio.
            Desde su cuenta solicita dominios, administra sus medios de pago, consulta comprobantes y abre tickets de soporte.
          </p>
          <div className="acciones portal-acciones">
            {perfil ? (
              <Link className="boton boton-primario boton-grande" to={INICIO_POR_TIPO[perfil.tipo]}>
                Ir a mi módulo
              </Link>
            ) : (
              <>
                <Link className="boton boton-primario boton-grande" to="/registro">
                  Registrarme
                </Link>
                <Link className="boton boton-secundario boton-grande" to="/iniciar-sesion">
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Visual Showcase con la Balsa Muisca */}
        <div className="portal-heroe-visual">
          <div className="portal-balsa-contenedor">
            <div className="portal-balsa-aura" aria-hidden="true" />
            <img
              src="/BalsaMuisca.svg"
              alt="Balsa Muisca - El Dorado"
              className="portal-balsa-img"
            />
            <div className="portal-balsa-pie">
              <img src="/tunjoLogo.svg" alt="" className="portal-balsa-mini-tunjo" />
              <div>
                <strong>Balsa Muisca</strong>
                <span>Patrimonio de oro, orfebrería y tradición</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Paquetes de Hosting */}
      <section className="portal-seccion">
        <div className="seccion-cabecera">
          <p className="antetitulo">Planes a su medida</p>
          <h2>Paquetes de hosting</h2>
          <p>Al registrarse elige un paquete y un plan de pago: mensual, trimestral, semestral o anual.</p>
        </div>

        <div className="paquetes">
          <article className="paquete paquete-plata">
            <div className="paquete-etiqueta-fila">
              <span className="paquete-nivel">01</span>
              <span className="etiqueta tono-plata">Nivel Inicial</span>
            </div>
            <p className="antetitulo">Paquete</p>
            <h3>Chibcha-Plata</h3>
            <p className="paquete-descripcion">
              Ideal para proyectos personales y sitios web informativos que inician su presencia en línea.
            </p>
            <ul className="paquete-caracteristicas">
              <li>1 Dominio incluido</li>
              <li>Almacenamiento veloz SSD</li>
              <li>Soporte técnico estándar</li>
            </ul>
          </article>

          <article className="paquete paquete-oro">
            <div className="paquete-destacado-badge">Más Elegido</div>
            <div className="paquete-etiqueta-fila">
              <span className="paquete-nivel nivel-oro">02</span>
              <span className="etiqueta tono-oro">Recomendado</span>
            </div>
            <p className="antetitulo antetitulo-oro">Paquete</p>
            <h3 className="texto-dorado">Chibcha-Oro</h3>
            <p className="paquete-descripcion">
              El equilibrio supremo en potencia, velocidad y rendimiento para empresas y portales dinámicos.
            </p>
            <ul className="paquete-caracteristicas">
              <li>Múltiples dominios y subdominios</li>
              <li>Prioridad alta en colas de atención</li>
              <li>Certificados SSL y respaldo continuo</li>
            </ul>
          </article>

          <article className="paquete paquete-platino">
            <div className="paquete-etiqueta-fila">
              <span className="paquete-nivel">03</span>
              <span className="etiqueta tono-platino">Corporativo</span>
            </div>
            <p className="antetitulo">Paquete</p>
            <h3>Chibcha-Platino</h3>
            <p className="paquete-descripcion">
              Máxima capacidad, ancho de banda ilimitado y soporte técnico prioritario de nivel avanzado.
            </p>
            <ul className="paquete-caracteristicas">
              <li>Recursos de procesamiento dedicados</li>
              <li>Atención SLA nivel 3 inmediata</li>
              <li>Migración e integración asistida</li>
            </ul>
          </article>
        </div>
      </section>

      {/* Servicios y Características */}
      <section className="portal-seccion">
        <div className="seccion-cabecera">
          <p className="antetitulo">Gestión Integral</p>
          <h2>Desde su cuenta</h2>
        </div>

        <div className="servicios">
          <div className="tarjeta-servicio">
            <div className="servicio-icono-caja">
              <img src="/BastonCeremonial.svg" alt="" className="servicio-icono" />
            </div>
            <h4>Dominios</h4>
            <p>Solicite un dominio. ChibchaWeb genera la solicitud en XML y usted decide cuándo enviarla al registrador.</p>
          </div>
          <div className="tarjeta-servicio">
            <div className="servicio-icono-caja">
              <img src="/tunjoLogo.svg" alt="" className="servicio-icono" />
            </div>
            <h4>Pagos</h4>
            <p>Registre tarjetas Visa, Mastercard o Diners y consulte el historial de cobros con sus recibos oficiales.</p>
          </div>
          <div className="tarjeta-servicio">
            <div className="servicio-icono-caja">
              <img src="/BastonCeremonial.svg" alt="" className="servicio-icono" />
            </div>
            <h4>Soporte</h4>
            <p>Abra tickets sobre sus sitios y siga su avance en tiempo real hasta la solución definitiva.</p>
          </div>
          <div className="tarjeta-servicio">
            <div className="servicio-icono-caja">
              <img src="/tunjoLogo.svg" alt="" className="servicio-icono" />
            </div>
            <h4>Cuentas</h4>
            <p>Los clientes se registran aquí. Distribuidores y personal reciben su cuenta de un administrador.</p>
          </div>
        </div>
      </section>

      {/* Sello de Marca Oficial ChibchaWeb */}
      <section className="portal-sello-seccion">
        <div className="portal-sello-tarjeta">
          <img src={cwLogo} alt="Sello Oficial ChibchaWeb" className="portal-sello-logo" />
          <div className="portal-sello-texto">
            <h3>Sello de Calidad ChibchaWeb</h3>
            <p>
              Inspirados en la ingeniería y metalurgia orfebre de la cultura Muisca, ofrecemos una plataforma de alojamiento robusta, confiable y segura respaldada por los más altos estándares tecnológicos.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
