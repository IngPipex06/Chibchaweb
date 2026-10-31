import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usuarios } from '../../api/servicios.js'
import { CLAVE_CORREO } from '../../api/sesion.js'
import { avisoDeError, avisoPendiente } from '../../componentes/avisos.js'
import { campoContraseñaNueva, campoCorreo } from '../../componentes/camposComunes.js'
import { cuentaRegresiva } from '../../componentes/formato.js'
import Formulario from '../../componentes/Formulario.jsx'
import { useBloqueo, useEnvio, useFormulario } from '../../componentes/ganchos.js'
import { Aviso, Pagina, Tarjeta } from '../../componentes/Interfaz.jsx'
import { PAQUETES, PLANES } from '../../componentes/valores.js'

const CAMPOS = [
  { tipo: 'titulo', etiqueta: 'Cuenta' },
  campoCorreo,
  campoContraseñaNueva,
  { nombre: 'preguntaSeguridad', etiqueta: 'Pregunta de seguridad', obligatorio: true, max: 255, completo: true, ayuda: 'Se usa para recuperar la contraseña.' },
  { nombre: 'respuestaSeguridad', etiqueta: 'Respuesta de seguridad', obligatorio: true, completo: true },
  { tipo: 'titulo', etiqueta: 'Datos personales' },
  { nombre: 'nombreCompleto', etiqueta: 'Nombre completo', obligatorio: true, max: 255, completo: true, autocompletar: 'name' },
  { nombre: 'tipoDocumento', etiqueta: 'Tipo de documento', obligatorio: true, max: 50 },
  { nombre: 'numeroDocumento', etiqueta: 'Número de documento', obligatorio: true, max: 50 },
  { nombre: 'teléfono', etiqueta: 'Teléfono', tipo: 'telefono', obligatorio: true, max: 30, autocompletar: 'tel' },
  { nombre: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', obligatorio: true, formato: 'mayorDeEdad' },
  { tipo: 'titulo', etiqueta: 'Servicio' },
  { nombre: 'paqueteHosting', etiqueta: 'Paquete de hosting', tipo: 'opciones', opciones: PAQUETES, obligatorio: true, completo: true },
  { nombre: 'planDePago', etiqueta: 'Plan de pago', tipo: 'opciones', opciones: PLANES, obligatorio: true, completo: true },
]

// Bloqueo del front: tras más de 5 intentos con datos incorrectos, 3 minutos.
// El backend no lleva esta cuenta en el registro.
const CLAVE_BLOQUEO = 'chibchaweb.bloqueo.registro'
const INTENTOS_PERMITIDOS = 5
const TRES_MINUTOS = 3 * 60 * 1000

export default function Registro() {
  const navegar = useNavigate()
  const formulario = useFormulario()
  const [ocupado, ejecutar] = useEnvio()
  const [aviso, setAviso] = useState(null)
  const bloqueo = useBloqueo(CLAVE_BLOQUEO)
  const fallos = useRef(0)

  const contarFallo = () => {
    fallos.current += 1
    if (fallos.current > INTENTOS_PERMITIDOS) {
      bloqueo.bloquear(TRES_MINUTOS)
      fallos.current = 0
    }
  }

  const registrar = () =>
    ejecutar('registro', async () => {
      if (bloqueo.restante) return
      if (!formulario.validar(CAMPOS)) return contarFallo()
      const v = formulario.valores
      const datos = {}
      for (const campo of CAMPOS) {
        if (campo.tipo === 'titulo') continue
        datos[campo.nombre] = campo.tipo === 'contraseña' ? v[campo.nombre] : String(v[campo.nombre] ?? '').trim()
      }
      datos.correo = datos.correo.toLowerCase()
      try {
        const r = await usuarios.registrar(datos)
        if (r.pendiente) return setAviso(avisoPendiente(r, 'Su registro se completará cuando el sistema concilie los datos.'))
        localStorage.setItem(CLAVE_CORREO, datos.correo)
        // Registrarse no inicia sesión.
        navegar('/iniciar-sesion', { state: { aviso: { tipo: 'ok', titulo: 'Registro completado', texto: 'Su cuenta de cliente quedó creada. Inicie sesión para entrar.' } } })
      } catch (error) {
        if (error.estado === 400 || error.estado === 409) contarFallo()
        formulario.marcarError(error)
        setAviso(avisoDeError(error))
      }
    })

  return (
    <Pagina
      antetitulo="Registro de cliente"
      titulo="Crear una cuenta"
      descripcion="Solo los clientes se registran por su cuenta. Distribuidores y personal reciben su acceso de un administrador."
      aviso={aviso}
      alCerrarAviso={() => setAviso(null)}
    >
      {bloqueo.restante > 0 && (
        <Aviso tipo="critico" titulo="Formulario restringido" texto={`Hubo demasiados intentos con datos incorrectos. Podrá intentar de nuevo en ${cuentaRegresiva(bloqueo.restante)}.`} />
      )}
      <Tarjeta anchoMaximo="860px">
        <Formulario
          campos={CAMPOS}
          formulario={formulario}
          alEnviar={registrar}
          enviando={ocupado.has('registro')}
          bloqueado={bloqueo.restante > 0}
          textoEnviar="Crear mi cuenta"
          textoEnviando="Registrando…"
          enlaces={[{ etiqueta: 'Ya tengo cuenta', alHacer: () => navegar('/iniciar-sesion') }]}
        />
      </Tarjeta>
    </Pagina>
  )
}
