import { etiqueta } from './valores.js'
import { LIMITE_ARCHIVO } from './validacion.js'

// Definición de un campo:
// { nombre, etiqueta, tipo, obligatorio, formato, max, completo, opciones, ayuda,
//   desactivado, marcador, autocompletar, teclado }
// tipo: texto (por defecto), correo, contraseña, fecha, mes, telefono, seleccion,
//       opciones, area, archivo o titulo (encabezado de bloque).

const TIPOS_DE_ENTRADA = { correo: 'email', contraseña: 'password', fecha: 'date', mes: 'month', telefono: 'tel' }

const normalizarOpciones = (opciones = []) =>
  opciones.map((o) => (typeof o === 'string' ? { valor: o, etiqueta: etiqueta(o) } : o))

function leerArchivo(evento, nombre, alCambiar) {
  const archivo = evento.target.files?.[0]
  if (!archivo) return alCambiar(nombre, null)
  if (archivo.size > LIMITE_ARCHIVO) return alCambiar(nombre, { nombre: archivo.name, tamaño: archivo.size, texto: null })
  archivo.text().then((texto) => alCambiar(nombre, { nombre: archivo.name, tamaño: archivo.size, texto }))
}

function Campo({ campo, valor, error, alCambiar, desactivado }) {
  const id = `campo-${campo.nombre}`
  const opciones = normalizarOpciones(campo.opciones)
  let ayuda = campo.ayuda
  if (campo.tipo === 'area') ayuda = `${(valor ?? '').length} de ${campo.max} caracteres`
  if (campo.tipo === 'archivo' && valor) ayuda = `${valor.nombre} · ${(valor.tamaño / 1024).toFixed(1)} KB`
  const descripcion = [error && `${id}-error`, ayuda && `${id}-ayuda`].filter(Boolean).join(' ') || undefined
  const comunes = { id, name: campo.nombre, disabled: desactivado, 'aria-invalid': error ? true : undefined, 'aria-describedby': descripcion }
  const alEscribir = (e) => alCambiar(campo.nombre, campo.formato === 'dominio' ? e.target.value.toLowerCase() : e.target.value)

  let control
  if (campo.tipo === 'seleccion') {
    control = (
      <select className="entrada" {...comunes} value={valor ?? ''} onChange={alEscribir}>
        <option value="">{campo.marcador ?? 'Seleccione…'}</option>
        {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
      </select>
    )
  } else if (campo.tipo === 'opciones') {
    control = (
      <div className="segmento" role="radiogroup" aria-labelledby={`${id}-etiqueta`} aria-invalid={error ? true : undefined} aria-describedby={descripcion}>
        {opciones.map((o) => (
          <label key={o.valor} className="segmento-opcion">
            <input type="radio" name={campo.nombre} value={o.valor} checked={valor === o.valor} disabled={desactivado} onChange={() => alCambiar(campo.nombre, o.valor)} />
            {o.etiqueta}
          </label>
        ))}
      </div>
    )
  } else if (campo.tipo === 'area') {
    control = <textarea className="entrada" {...comunes} value={valor ?? ''} maxLength={campo.max} onChange={alEscribir} />
  } else if (campo.tipo === 'archivo') {
    control = <input className="entrada-archivo" {...comunes} type="file" accept=".csv,text/csv" onChange={(e) => leerArchivo(e, campo.nombre, alCambiar)} />
  } else {
    control = (
      <input
        className="entrada"
        {...comunes}
        type={TIPOS_DE_ENTRADA[campo.tipo] ?? 'text'}
        inputMode={campo.teclado}
        autoComplete={campo.autocompletar ?? 'off'}
        placeholder={campo.marcador}
        maxLength={campo.max}
        value={valor ?? ''}
        onChange={alEscribir}
      />
    )
  }

  const Rotulo = campo.tipo === 'opciones' ? 'span' : 'label'
  return (
    <div className={`campo${campo.completo ? ' campo-completo' : ''}`}>
      <Rotulo id={`${id}-etiqueta`} className="campo-etiqueta" htmlFor={campo.tipo === 'opciones' ? undefined : id}>
        {campo.etiqueta}
        {!campo.obligatorio && <span className="opcional"> (opcional)</span>}
      </Rotulo>
      {control}
      {error && <p id={`${id}-error`} role="alert" className="error-campo">{error}</p>}
      {ayuda && <p id={`${id}-ayuda`} className="ayuda">{ayuda}</p>}
    </div>
  )
}

export default function Formulario({ campos, formulario, alEnviar, enviando, textoEnviar, textoEnviando = 'Enviando…', alCancelar, enlaces = [], bloqueado = false, intro }) {
  const { valores, errores, cambiar } = formulario
  return (
    <form
      className="formulario"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!enviando && !bloqueado) alEnviar()
      }}
    >
      {intro}
      <div className="formulario-rejilla">
        {campos.map((campo, i) =>
          campo.tipo === 'titulo' ? (
            <div key={`titulo-${i}`} className="formulario-seccion">
              <h4>{campo.etiqueta}</h4>
              {campo.ayuda && <p className="ayuda">{campo.ayuda}</p>}
              {campo.nombre && errores[campo.nombre] && <p role="alert" className="error-bloque">{errores[campo.nombre]}</p>}
            </div>
          ) : (
            <Campo key={campo.nombre} campo={campo} valor={valores[campo.nombre]} error={errores[campo.nombre]} alCambiar={cambiar} desactivado={bloqueado || campo.desactivado} />
          ),
        )}
      </div>
      <div className="formulario-acciones">
        <button type="submit" className="boton boton-primario" disabled={enviando || bloqueado}>
          {enviando ? textoEnviando : textoEnviar}
        </button>
        {alCancelar && <button type="button" className="boton boton-secundario" onClick={alCancelar}>Cancelar</button>}
        {enlaces.map((e) => (
          <button key={e.etiqueta} type="button" className="boton boton-fantasma" onClick={e.alHacer}>{e.etiqueta}</button>
        ))}
      </div>
    </form>
  )
}
