import jwt from 'jsonwebtoken';
import { entorno } from '../../config/entorno.js';
import * as UsuarioGateway from '../../datos/gateways/UsuarioGateway.js';
import { EstadoUsuario } from '../../dominio/usuarios/EstadoUsuario.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { cargarUsuario, describirPerfil } from './ServicioDeUsuarios.js';
import { exigirContraseñaNueva, exigirCorreo, exigirValorHasheable } from './validacion.js';

const CREDENCIALES_INCORRECTAS = 'Identificador o contraseña incorrectos';
const RECUPERACION_NO_DISPONIBLE = 'La cuenta no admite recuperación de contraseña';

/** UC2. Una cuenta inhabilitada solo se revela con credenciales correctas (E3). */
export async function iniciarSesion({ correo, contraseña }) {
	const correoValido = exigirCorreo(correo);
	const contraseñaValida = exigirValorHasheable(contraseña, 'contraseña');

	const fila = await UsuarioGateway.buscarPorCorreo(correoValido);
	if (!fila) throw new ErrorDeServicio(401, CREDENCIALES_INCORRECTAS);
	const usuario = await cargarUsuario(fila);
	if (!(await usuario.iniciarSesión(contraseñaValida))) {
		throw new ErrorDeServicio(401, CREDENCIALES_INCORRECTAS);
	}
	if (usuario.estado !== EstadoUsuario.Activo) {
		throw new ErrorDeServicio(403, 'Cuenta inactiva, contacte al administrador');
	}

	const token = jwt.sign({}, entorno.secretoJwt, { subject: usuario.id, expiresIn: entorno.expiracionJwt });
	return { token, perfil: describirPerfil(usuario) };
}

export function verificarToken(token) {
	try {
		return jwt.verify(token, entorno.secretoJwt).sub;
	} catch {
		throw new ErrorDeServicio(401, 'La sesión no es válida o expiró');
	}
}

export async function obtenerPerfil(id) {
	const fila = await UsuarioGateway.buscarPorId(id);
	if (!fila || fila.estado !== EstadoUsuario.Activo) {
		throw new ErrorDeServicio(401, 'La sesión no es válida o expiró');
	}
	return describirPerfil(await cargarUsuario(fila));
}

async function cargarCuentaRecuperable(correo) {
	const fila = await UsuarioGateway.buscarPorCorreo(exigirCorreo(correo));
	if (!fila || fila.estado !== EstadoUsuario.Activo || !fila.preguntaSeguridad) {
		throw new ErrorDeServicio(404, RECUPERACION_NO_DISPONIBLE);
	}
	return cargarUsuario(fila);
}

/** UC3: primer paso, presentar la pregunta de seguridad. */
export async function obtenerPreguntaDeSeguridad({ correo }) {
	const usuario = await cargarCuentaRecuperable(correo);
	return { pregunta: usuario.preguntaDeSeguridad.pregunta };
}

/** UC3 y UC4: si la respuesta no coincide se corta el flujo sin revelar la correcta. */
export async function recuperarContraseña({ correo, respuesta, nuevaContraseña }) {
	const respuestaValida = exigirValorHasheable(respuesta, 'respuesta');
	const nueva = exigirContraseñaNueva(nuevaContraseña, 'nuevaContraseña');

	const usuario = await cargarCuentaRecuperable(correo);
	if (!(await usuario.preguntaDeSeguridad.validarRespuesta(respuestaValida))) {
		throw new ErrorDeServicio(401, 'La respuesta de seguridad no es correcta');
	}
	await usuario.restablecerContraseña(nueva);
	await UsuarioGateway.actualizarContraseña(usuario.id, usuario.contraseña);
}
