import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usuarios } from '../../api/servicios.js'
import { CLAVE_CORREO, INICIO_POR_TIPO, useSesion } from '../../api/sesion.js'
import { avisoDeError } from '../../componentes/avisos.js'
import { campoCorreo } from '../../componentes/camposComunes.js'
import { cuentaRegresiva } from '../../componentes/formato.js'
import Formulario from '../../componentes/Formulario.jsx'
import { useBloqueo, useEnvio, useFormulario } from '../../componentes/ganchos.js'
import { Aviso, Pagina, Tarjeta } from '../../componentes/Interfaz.jsx'

const CAMPOS = [
  { ...campoCorreo, completo: true, autocompletar: 'username' },
  { nombre: 'contraseña', etiqueta: 'Contraseña', tipo: 'contraseña', obligatorio: true, completo: true, autocompletar: 'current-password' },
]

// El backend cuenta los intentos; el front solo aplica la espera cuando
// la respuesta trae limiteDeIntentosAlcanzado: true.
const CLAVE_BLOQUEO = 'chibchaweb.bloqueo.sesion'
const TRES_MINUTOS = 3 * 60 * 1000

export default function InicioSesion() {
  const navegar = useNavigate()
  const { iniciar } = useSesion()
  const formulario = useFormulario({ correo: localStorage.getItem(CLAVE_CORREO) ?? '' })
  const [ocupado, ejecutar] = useEnvio()
  const [aviso, setAviso] = useState(null)
  const bloqueo = useBloqueo(CLAVE_BLOQUEO)

  const irARecuperar = (correo) => navegar('/recuperar-contrasena', { state: { correo } })

  const entrar = () =>
    ejecutar('sesion', async () => {
      if (bloqueo.restante || !formulario.validar(CAMPOS)) return
      const correo = formulario.valores.correo.trim().toLowerCase()
      try {
        const { datos } = await usuarios.iniciarSesion(correo, formulario.valores.contraseña)
        localStorage.setItem(CLAVE_CORREO, correo)
        bloqueo.liberar()
        iniciar(datos.token, datos.perfil)
        navegar(INICIO_POR_TIPO[datos.perfil.tipo], { replace: true })
      } catch (error) {
        if (error.datos?.limiteDeIntentosAlcanzado) bloqueo.bloquear(TRES_MINUTOS)
        // UC2 E3: cuenta inactiva. Se informa y no se ofrece recuperación.
        if (error.estado === 403) return setAviso(avisoDeError(error, 'Cuenta inactiva'))
        // UC2 E2: en cada fallo se ofrece recuperar la contraseña.
        setAviso({
          ...avisoDeError(error, error.estado === 401 ? 'No se pudo iniciar sesión' : undefined),
          acciones: error.datos?.ofrecerRecuperacion ? [{ etiqueta: 'Recuperar contraseña', primario: true, alHacer: () => irARecuperar(correo) }] : [],
        })
      }
    })

  return (
    <Pagina
      antetitulo="Acceso"
      titulo="Iniciar sesión"
      descripcion="Clientes, distribuidores, administradores y técnicos entran por aquí. Cada uno llega a su módulo."
      aviso={aviso}
      alCerrarAviso={() => setAviso(null)}
    >
      {bloqueo.restante > 0 && (
        <Aviso tipo="critico" titulo="Formulario restringido" texto={`Se alcanzó el límite de intentos. Podrá intentar de nuevo en ${cuentaRegresiva(bloqueo.restante)}.`} />
      )}
      <Tarjeta anchoMaximo="560px">
        <Formulario
          campos={CAMPOS}
          formulario={formulario}
          alEnviar={entrar}
          enviando={ocupado.has('sesion')}
          bloqueado={bloqueo.restante > 0}
          textoEnviar="Iniciar sesión"
          textoEnviando="Entrando…"
          enlaces={[
            { etiqueta: 'Olvidé mi contraseña', alHacer: () => irARecuperar(formulario.valores.correo?.trim().toLowerCase()) },
            { etiqueta: 'Crear cuenta de cliente', alHacer: () => navegar('/registro') },
          ]}
        />
      </Tarjeta>
    </Pagina>
  )
}
