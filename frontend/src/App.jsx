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
        <footer className="contenedor pie">
          ChibchaWeb · Fundamentos de Ingeniería de Software · Universidad Distrital, 2026-III
        </footer>
      </div>
    </ProveedorDeSesion>
  )
}
