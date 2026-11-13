import { FRANQUICIAS } from '../../dominio/perfiles/Franquicias.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { exigirTexto, fechaOpcional } from '../usuarios/validacion.js';

/** Reconstruye la tarjeta de una fila; sin el número completo, que no se guarda. */
export function crearTarjeta(fila) {
	return new FRANQUICIAS[fila.tipoTarjeta](fila);
}

function rechazarTarjeta(errores) {
	return new ErrorDeServicio(400, `Tarjeta inválida: ${errores.join(', ')}`, 'tarjeta', { errores });
}

/** UC8. Devuelve la fila lista para guardar; el número completo no sale de aquí. */
export function validarTarjeta(datos) {
	if (datos === null || typeof datos !== 'object') {
		throw new ErrorDeServicio(400, 'El campo es obligatorio', 'tarjeta');
	}
	if (typeof datos.franquicia !== 'string' || !Object.hasOwn(FRANQUICIAS, datos.franquicia)) {
		throw rechazarTarjeta(['franquicia no aceptada']);
	}
	const Tarjeta = FRANQUICIAS[datos.franquicia];
	const tarjeta = new Tarjeta({
		numero: exigirTexto(datos.numero, 'tarjeta', 19),
		fechaExpiración: fechaOpcional(exigirTexto(datos.fechaExpiración, 'tarjeta', 10), 'tarjeta'),
	});
	if (!tarjeta.validar()) {
		throw rechazarTarjeta(tarjeta.motivosDeRechazo);
	}
	return {
		tipoTarjeta: datos.franquicia,
		numeroEnmascarado: tarjeta.numeroEnmascarado,
		fechaExpiración: tarjeta.fechaExpiración,
	};
}
