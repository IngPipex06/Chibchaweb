import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usuarios } from '../../api/servicios.js'
import { CLAVE_CORREO } from '../../api/sesion.js'
import { avisoDeError } from '../../componentes/avisos.js'
import { campoCorreo } from '../../componentes/camposComunes.js'
import Formulario from '../../componentes/Formulario.jsx'
import { useEnvio, useFormulario } from '../../componentes/ganchos.js'
import { Pagina, Tarjeta } from '../../componentes/Interfaz.jsx'

const CAMPOS_CORREO = [{ ...campoCorreo, etiqueta: 'Correo de la cuenta', completo: true }]
const CAMPOS_RESPUESTA = [
  { nombre: 'respuesta', etiqueta: 'Respuesta', obligatorio: true, completo: true },
  { nombre: 'nuevaContraseña', etiqueta: 'Nueva contraseña', tipo: 'contraseña', obligatorio: true, formato: 'contraseña', completo: true, autocompletar: 'new-password', ayuda: 'Mínimo 8 caracteres.' },
]

// UC3 y UC4. Todo el flujo es interno: sin correo ni SMS.
export default function RecuperarContrasena() {
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [paso, setPaso] = useState({ numero: 1 })
  const [aviso, setAviso] = useState(null)
  const [ocupado, ejecutar] = useEnvio()
  const formularioCorreo = useFormulario({ correo: ubicacion.state?.correo ?? '' })
  const formularioRespuesta = useFormulario()

  const pedirPregunta = () =>
    ejecutar('pregunta', async () => {
      if (!formularioCorreo.validar(CAMPOS_CORREO)) return
      const correo = formularioCorreo.valores.correo.trim().toLowerCase()
      try {
        const { datos } = await usuarios.pregunta(correo)
        setAviso(null)
        setPaso({ numero: 2, correo, pregunta: datos.pregunta })
      } catch (error) {
        if (error.estado === 404) {
          // "La cuenta no admite recuperación de contraseña": se informa y termina.
          setPaso({ numero: 0 })
          return setAviso({ ...avisoDeError(error, 'Recuperación no disponible'), acciones: [{ etiqueta: 'Volver a iniciar sesión', primario: true, alHacer: () => navegar('/iniciar-sesion') }] })
        }
        formularioCorreo.marcarError(error)
        setAviso(avisoDeError(error))
      }
    })

  const cambiarContraseña = () =>
    ejecutar('recuperar', async () => {
      if (!formularioRespuesta.validar(CAMPOS_RESPUESTA)) return
      const v = formularioRespuesta.valores
      try {
        await usuarios.recuperar({ correo: paso.correo, respuesta: v.respuesta.trim(), nuevaContraseña: v.nuevaContraseña })
        localStorage.setItem(CLAVE_CORREO, paso.correo)
        navegar('/iniciar-sesion', { state: { aviso: { tipo: 'ok', titulo: 'Contraseña actualizada', texto: 'Ya puede iniciar sesión con su nueva contraseña.' } } })
      } catch (error) {
        // 401 respuesta incorrecta; 429 tras 5 fallos.
        formularioRespuesta.marcarError(error)
        setAviso(avisoDeError(error, error.estado === 401 ? 'Respuesta incorrecta' : undefined))
      }
    })

  return (
    <Pagina
      antetitulo="Acceso"
      titulo="Recuperar contraseña"
      descripcion={paso.numero === 2 ? `Cuenta: ${paso.correo}` : 'La recuperación se hace aquí mismo con su pregunta de seguridad.'}
      aviso={aviso}
      alCerrarAviso={() => setAviso(null)}
    >
      {paso.numero === 1 && (
        <Tarjeta anchoMaximo="560px">
          <Formulario
            campos={CAMPOS_CORREO}
            formulario={formularioCorreo}
            alEnviar={pedirPregunta}
            enviando={ocupado.has('pregunta')}
            textoEnviar="Continuar"
            textoEnviando="Buscando…"
            enlaces={[{ etiqueta: 'Volver a iniciar sesión', alHacer: () => navegar('/iniciar-sesion') }]}
          />
        </Tarjeta>
      )}
      {paso.numero === 2 && (
        <Tarjeta anchoMaximo="560px">
          <Formulario
            campos={CAMPOS_RESPUESTA}
            formulario={formularioRespuesta}
            alEnviar={cambiarContraseña}
            enviando={ocupado.has('recuperar')}
            textoEnviar="Cambiar contraseña"
            textoEnviando="Guardando…"
            intro={
              <div className="intro">
                <p className="antetitulo" style={{ marginBottom: 2 }}>Pregunta de seguridad</p>
                <p>{paso.pregunta}</p>
              </div>
            }
            enlaces={[{ etiqueta: 'Usar otro correo', alHacer: () => { setAviso(null); setPaso({ numero: 1 }) } }]}
          />
        </Tarjeta>
      )}
    </Pagina>
  )
}
