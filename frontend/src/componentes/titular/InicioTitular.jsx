import { soporte, usuarios } from '../../api/servicios.js'
import { useDatos } from '../ganchos.js'
import { Accesos, Celda, ConDatos, ErrorDeCarga, Ficha, Pagina, Tabla, Tarjeta } from '../Interfaz.jsx'
import { etiqueta } from '../valores.js'

// Inicio de Cliente y Distribuidor. El perfil propio es de solo lectura:
// ningún caso de uso permite editarlo.
export default function InicioTitular({ antetitulo, descripcion, accesos, tituloSitios, notaSitios, vacioSitios }) {
  const perfil = useDatos(() => usuarios.perfil())
  const sitios = useDatos(() => soporte.sitios())
  const p = perfil.datos

  return (
    <Pagina antetitulo={antetitulo} titulo={p ? `Hola, ${String(p.nombre ?? p.correo).split(' ')[0]}` : 'Inicio'} descripcion={descripcion}>
      <Tarjeta mitad titulo="Su cuenta" nota="Datos de solo lectura.">
        {perfil.error && !p ? (
          <ErrorDeCarga error={perfil.error} alReintentar={perfil.recargar} />
        ) : (
          <ConDatos consulta={perfil}>
            {(d) => <Ficha pares={[['Nombre', d.nombre, true], ['Correo', d.correo], ['Tipo de usuario', etiqueta(d.tipo)]]} />}
          </ConDatos>
        )}
      </Tarjeta>
      <Tarjeta mitad titulo="Accesos">
        <Accesos items={accesos} />
      </Tarjeta>
      <Tarjeta titulo={tituloSitios} nota={notaSitios}>
        <ConDatos consulta={sitios}>
          {(lista) => (
            <Tabla
              etiqueta={tituloSitios}
              columnas={['Sitio']}
              vacio={vacioSitios}
              filas={lista.map((s) => ({ clave: s.id, celdas: [<Celda key="n" fuerte texto={s.nombre} />] }))}
            />
          )}
        </ConDatos>
      </Tarjeta>
    </Pagina>
  )
}
