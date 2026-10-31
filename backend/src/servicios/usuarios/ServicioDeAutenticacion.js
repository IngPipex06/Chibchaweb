import jwt from 'jsonwebtoken';
import { entorno } from '../../config/entorno.js';
import * as UsuarioGateway from '../../datos/gateways/UsuarioGateway.js';
import { Administrador } from '../../dominio/usuarios/Administrador.js';
import { Cliente } from '../../dominio/usuarios/Cliente.js';
import { EstadoUsuario } from '../../dominio/usuarios/EstadoUsuario.js';
import { TécnicoDeSoporte } from '../../dominio/usuarios/TecnicoDeSoporte.js';
import { Titular } from '../../dominio/usuarios/Titular.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { cargarUsuario, describirPerfil } from './ServicioDeUsuarios.js';
import { exigirContraseñaNueva, exigirCorreo, exigirValorHasheable } from './validacion.js';

const CREDENCIALES_INCORRECTAS = 'Identificador o contraseña incorrectos';
const RECUPERACION_NO_DISPONIBLE = 'La cuenta no admite recuperación de contraseña';

const LIMITE_DE_INTENTOS = 5;
const MAXIMO_DE_CORREOS_EN_SEGUIMIENTO = 10000;
const ESPERA_DE_RECUPERACION_MS = 15 * 60 * 1000;

/**
 * UC2 E2: la recuperación se ofrece en cada fallo y el contador marca el límite.
 * En memoria, fuera del dominio. Cuenta también correos inexistentes
 * para que la respuesta no revele cuáles están registrados.
 */
const intentosFallidos = new Map();

function rechazarCredenciales(correo) {
	if (intentosFallidos.size >= MAXIMO_DE_CORREOS_EN_SEGUIMIENTO) intentosFallidos.clear();
	const intentos = (intentosFallidos.get(correo) ?? 0) + 1;
	intentosFallidos.set(correo, intentos);
	return new ErrorDeServicio(401, CREDENCIALES_INCORRECTAS, null, {
		ofrecerRecuperacion: true,
		limiteDeIntentosAlcanzado: intentos >= LIMITE_DE_INTENTOS,
	});
}

/** UC2. Una cuenta inhabilitada solo se revela con credenciales correctas (E3). */
export async function iniciarSesion({ correo, contraseña }) {
	const correoValido = exigirCorreo(correo);
	const contraseñaValida = exigirValorHasheable(contraseña, 'contraseña');

	const fila = await UsuarioGateway.buscarPorCorreo(correoValido);
	if (!fila) throw rechazarCredenciales(correoValido);
	const usuario = await cargarUsuario(fila);
	if (!(await usuario.iniciarSesión(contraseñaValida))) {
		throw rechazarCredenciales(correoValido);
	}
	intentosFallidos.delete(correoValido);
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

export async function cargarUsuarioDeSesion(id) {
	const fila = await UsuarioGateway.buscarPorId(id);
	if (!fila || fila.estado !== EstadoUsuario.Activo) {
		throw new ErrorDeServicio(401, 'La sesión no es válida o expiró');
	}
	return cargarUsuario(fila);
}

async function cargarUsuarioDeTipo(id, Tipo) {
	const usuario = await cargarUsuarioDeSesion(id);
	if (!(usuario instanceof Tipo)) {
		throw new ErrorDeServicio(403, 'No tiene permiso para esta operación');
	}
	return usuario;
}

export const cargarAdministrador = (id) => cargarUsuarioDeTipo(id, Administrador);
export const cargarCliente = (id) => cargarUsuarioDeTipo(id, Cliente);
export const cargarTécnico = (id) => cargarUsuarioDeTipo(id, TécnicoDeSoporte);
export const cargarTitular = (id) => cargarUsuarioDeTipo(id, Titular);

export async function cargarAdministradorConPermiso(id, nombrePermiso) {
	const administrador = await cargarAdministrador(id);
	if (!administrador.rol.tienePermiso(nombrePermiso)) {
		throw new ErrorDeServicio(403, 'No tiene permiso para esta operación');
	}
	return administrador;
}

export async function obtenerPerfil(id) {
	return describirPerfil(await cargarUsuarioDeSesion(id));
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

/** Cuenta los fallos por correo para que la respuesta de seguridad no se pueda adivinar por fuerza bruta. */
const fallosDeRecuperacion = new Map();

function exigirRecuperacionPermitida(correo) {
	const fallos = fallosDeRecuperacion.get(correo);
	if (!fallos || fallos.intentos < LIMITE_DE_INTENTOS) return;
	if (Date.now() - fallos.ultimo >= ESPERA_DE_RECUPERACION_MS) {
		fallosDeRecuperacion.delete(correo);
		return;
	}
	throw new ErrorDeServicio(429, 'Demasiados intentos, espere 15 minutos');
}

function registrarFalloDeRecuperacion(correo) {
	if (fallosDeRecuperacion.size >= MAXIMO_DE_CORREOS_EN_SEGUIMIENTO) fallosDeRecuperacion.clear();
	const intentos = (fallosDeRecuperacion.get(correo)?.intentos ?? 0) + 1;
	fallosDeRecuperacion.set(correo, { intentos, ultimo: Date.now() });
}

/** UC3 y UC4: si la respuesta no coincide se corta el flujo sin revelar la correcta. */
export async function recuperarContraseña({ correo, respuesta, nuevaContraseña }) {
	const respuestaValida = exigirValorHasheable(respuesta, 'respuesta');
	const nueva = exigirContraseñaNueva(nuevaContraseña, 'nuevaContraseña');

	const correoValido = exigirCorreo(correo);
	exigirRecuperacionPermitida(correoValido);
	const usuario = await cargarCuentaRecuperable(correoValido);
	if (!(await usuario.preguntaDeSeguridad.validarRespuesta(respuestaValida))) {
		registrarFalloDeRecuperacion(correoValido);
		throw new ErrorDeServicio(401, 'La respuesta de seguridad no es correcta');
	}
	fallosDeRecuperacion.delete(correoValido);
	await usuario.restablecerContraseña(nueva);
	await UsuarioGateway.actualizarContraseña(usuario.id, usuario.contraseña);
}
