import { ErrorDeServicio } from '../ErrorDeServicio.js';

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// bcrypt solo usa los primeros 72 bytes; una clave más larga se recorta sin avisar.
const MAXIMO_BYTES_HASH = 72;
const MINIMO_CONTRASEÑA = 8;

export function exigirTexto(valor, campo, maximo = 255) {
	if (typeof valor !== 'string' || valor.trim() === '') {
		throw new ErrorDeServicio(400, 'El campo es obligatorio', campo);
	}
	if (valor.length > maximo) {
		throw new ErrorDeServicio(400, `El campo admite máximo ${maximo} caracteres`, campo);
	}
	return valor.trim();
}

export function exigirCorreo(valor) {
	const correo = exigirTexto(valor, 'correo').toLowerCase();
	if (!FORMATO_CORREO.test(correo)) {
		throw new ErrorDeServicio(400, 'El correo no tiene un formato válido', 'correo');
	}
	return correo;
}

export function exigirValorHasheable(valor, campo) {
	if (typeof valor !== 'string' || valor === '') {
		throw new ErrorDeServicio(400, 'El campo es obligatorio', campo);
	}
	if (Buffer.byteLength(valor) > MAXIMO_BYTES_HASH) {
		throw new ErrorDeServicio(400, `El campo admite máximo ${MAXIMO_BYTES_HASH} bytes`, campo);
	}
	return valor;
}

export function exigirContraseñaNueva(valor, campo = 'contraseña') {
	const contraseña = exigirValorHasheable(valor, campo);
	if (contraseña.length < MINIMO_CONTRASEÑA) {
		throw new ErrorDeServicio(400, `La contraseña debe tener al menos ${MINIMO_CONTRASEÑA} caracteres`, campo);
	}
	return contraseña;
}

export function exigirOpcion(valor, opciones, campo) {
	if (!Object.values(opciones).includes(valor)) {
		throw new ErrorDeServicio(400, 'El valor no es una opción válida', campo);
	}
	return valor;
}

export function textoOpcional(valor, campo, maximo) {
	return valor === undefined || valor === null || valor === '' ? null : exigirTexto(valor, campo, maximo);
}

export function fechaOpcional(valor, campo) {
	if (valor === undefined || valor === null || valor === '') return null;
	const fecha = typeof valor === 'string' ? new Date(valor) : null;
	if (!fecha || Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
		throw new ErrorDeServicio(400, 'La fecha debe tener el formato AAAA-MM-DD', campo);
	}
	return valor;
}
