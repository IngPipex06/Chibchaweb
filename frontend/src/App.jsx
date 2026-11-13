import Encabezado from './componentes/Encabezado.jsx'
import ProveedorDeSesion from './componentes/ProveedorDeSesion.jsx'
import Rutas from './rutas/Rutas.jsx'

export default function App() {
  return (
    <ProveedorDeSesion>
      <div className="app">
        <Encabezado />
        <main className="contenedor principal">
          <Rutas />
        </main>
        <footer className="pie-contenedor">
          <div className="contenedor pie-contenido">
            <div className="pie-marca">
              <img src="/tunjoLogo.svg" alt="Tunjo Logo" className="pie-logo" />
              <span className="pie-nombre">
                Chibcha<span className="pie-dorado">Web</span>
              </span>
            </div>
            <p className="pie-texto">
              ChibchaWeb · Fundamentos de Ingeniería de Software · Universidad Distrital, 2026-III
            </p>
          </div>
        </footer>
      </div>
    </ProveedorDeSesion>
  )
}
