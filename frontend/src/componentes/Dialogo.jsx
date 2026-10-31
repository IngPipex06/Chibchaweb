import { useEffect, useRef, useState } from 'react'
import { validarValor } from './validacion.js'

// Confirmación, con un campo de texto opcional (solución, motivo, nota).
// Lo escrito se conserva mientras el diálogo esté abierto.
export default function Dialogo({ titulo, texto, campo, textoConfirmar = 'Aceptar', alConfirmar, alCancelar }) {
  const [valor, setValor] = useState(campo?.inicial ?? '')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const caja = useRef(null)
  const cancelar = useRef(alCancelar)
  useEffect(() => {
    cancelar.current = alCancelar
  }, [alCancelar])

  useEffect(() => {
    const previo = document.activeElement
    caja.current?.querySelector('textarea, .boton-primario')?.focus()
    const alTeclear = (e) => {
      if (e.key === 'Escape') cancelar.current()
    }
    window.addEventListener('keydown', alTeclear)
    return () => {
      window.removeEventListener('keydown', alTeclear)
      previo?.focus?.()
    }
  }, [])

  const confirmar = async () => {
    const limpio = valor.trim()
    if (campo) {
      const mensaje = validarValor({ obligatorio: true, max: campo.max }, limpio)
      if (mensaje) return setError(mensaje)
    }
    setEnviando(true)
    try {
      await alConfirmar(limpio)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fondo-dialogo" onClick={(e) => e.target === e.currentTarget && !enviando && alCancelar()}>
      <div ref={caja} className="dialogo" role="dialog" aria-modal="true" aria-labelledby="dialogo-titulo">
        <h3 id="dialogo-titulo">{titulo}</h3>
        {texto && <p>{texto}</p>}
        {campo && (
          <div className="campo">
            <label htmlFor="dialogo-campo">{campo.etiqueta}</label>
            <textarea
              id="dialogo-campo"
              className="entrada"
              value={valor}
              maxLength={campo.max}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setValor(e.target.value)
                setError('')
              }}
            />
            {error && <p role="alert" className="error-campo">{error}</p>}
            <p className="ayuda">{valor.length} de {campo.max} caracteres</p>
          </div>
        )}
        <div className="acciones">
          <button type="button" className="boton boton-secundario" disabled={enviando} onClick={alCancelar}>Cancelar</button>
          <button type="button" className="boton boton-primario" disabled={enviando} onClick={confirmar}>
            {enviando ? 'Enviando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
