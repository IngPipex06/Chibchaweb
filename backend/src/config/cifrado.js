import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { entorno } from './entorno.js';

const LONGITUD_ETIQUETA = 16;

// Cada algoritmo usa su propia clave, derivada de la clave maestra del entorno.
function derivarClave({ nombre, longitudClave }) {
	return Buffer.from(hkdfSync('sha256', entorno.claveRespaldo, '', nombre, longitudClave));
}

function opcionesDe({ autenticado }) {
	return autenticado ? { authTagLength: LONGITUD_ETIQUETA } : undefined;
}

/** Devuelve en base64 el vector inicial, la etiqueta (si existe) y el contenido cifrado. */
export function cifrarTexto(especificacion, datos) {
	const iv = randomBytes(especificacion.longitudIv);
	const cifrador = createCipheriv(especificacion.nombre, derivarClave(especificacion), iv, opcionesDe(especificacion));
	const contenido = Buffer.concat([cifrador.update(datos, 'utf8'), cifrador.final()]);
	const etiqueta = especificacion.autenticado ? cifrador.getAuthTag() : Buffer.alloc(0);
	return Buffer.concat([iv, etiqueta, contenido]).toString('base64');
}

export function descifrarTexto(especificacion, datos) {
	const paquete = Buffer.from(datos, 'base64');
	const finIv = especificacion.longitudIv;
	const finEtiqueta = finIv + (especificacion.autenticado ? LONGITUD_ETIQUETA : 0);
	const descifrador = createDecipheriv(
		especificacion.nombre,
		derivarClave(especificacion),
		paquete.subarray(0, finIv),
		opcionesDe(especificacion),
	);
	if (especificacion.autenticado) descifrador.setAuthTag(paquete.subarray(finIv, finEtiqueta));
	return Buffer.concat([descifrador.update(paquete.subarray(finEtiqueta)), descifrador.final()]).toString('utf8');
}
