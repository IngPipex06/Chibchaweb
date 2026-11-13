import { useCallback, useEffect, useRef, useState } from 'react'
import { textoDeMotivo, validarCampos } from './validacion.js'

// Consulta con estados de carga, error y recarga. Al recargar conserva los datos
// anteriores para que la lista no parpadee.
export function useDatos(cargar, dependencias = []) {
  const [estado, setEstado] = useState({ cargando: true, datos: undefined, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    cargar()
      .then((r) => vigente && setEstado({ cargando: false, datos: r.datos, error: null }))
      .catch((error) => vigente && setEstado((s) => ({ cargando: false, datos: s.datos, error })))
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version])

  const recargar = useCallback(() => {
    setEstado((s) => ({ ...s, cargando: true }))
    setVersion((v) => v + 1)
  }, [])

  return { ...estado, recargar }
}

// Protección contra el doble envío: una misma clave no se ejecuta dos veces a la vez.
// Claves distintas sí corren en paralelo (por ejemplo, pausar durante una reanudación).
export function useEnvio() {
  const enCurso = useRef(new Set())
  const [activos, setActivos] = useState(() => new Set())

  const ejecutar = useCallback(async (clave, tarea) => {
    if (enCurso.current.has(clave)) return undefined
    enCurso.current.add(clave)
    setActivos(new Set(enCurso.current))
    try {
      return await tarea()
    } finally {
      enCurso.current.delete(clave)
      setActivos(new Set(enCurso.current))
    }
  }, [])

  return [activos, ejecutar]
}

// Estado de un formulario. Lo escrito se conserva cuando el servidor rechaza.
export function useFormulario(iniciales = {}) {
  const [valores, setValores] = useState(iniciales)
  const [errores, setErrores] = useState({})

  const cambiar = useCallback((nombre, valor) => {
    setValores((v) => ({ ...v, [nombre]: valor }))
    setErrores((e) => ({ ...e, [nombre]: '' }))
  }, [])

  const validar = (campos) => {
    const nuevos = validarCampos(campos, valores)
    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  // El backend señala un campo o un bloque completo ("dirección", "tarjeta").
  const marcarError = (error) => {
    if (!error?.campo) return
    const nombre = String(error.campo).split('.').pop()
    const texto = [error.message, ...(error.errores ?? []).map(textoDeMotivo)].filter(Boolean).join(' · ')
    setErrores((e) => ({ ...e, [nombre]: texto, [error.campo]: texto }))
  }

  const reiniciar = useCallback((nuevos = {}) => {
    setValores(nuevos)
    setErrores({})
  }, [])

  return { valores, errores, cambiar, validar, marcarError, reiniciar }
}

// Restricción temporal de un formulario, guardada en el navegador para que
// recargar la página no la salte.
export function useBloqueo(clave) {
  const leer = useCallback(() => Math.max(0, Number(localStorage.getItem(clave) ?? 0) - Date.now()), [clave])
  const [restante, setRestante] = useState(leer)

  useEffect(() => {
    const temporizador = setInterval(() => {
      const r = leer()
      setRestante(r)
      if (!r) localStorage.removeItem(clave)
    }, 1000)
    return () => clearInterval(temporizador)
  }, [clave, leer])

  const bloquear = (ms) => {
    localStorage.setItem(clave, String(Date.now() + ms))
    setRestante(ms)
  }
  const liberar = () => {
    localStorage.removeItem(clave)
    setRestante(0)
  }
  return { restante, bloquear, liberar }
}
