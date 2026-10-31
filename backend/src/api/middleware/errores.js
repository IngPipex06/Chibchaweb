import { ErrorDeServicio } from '../../servicios/ErrorDeServicio.js';

// Express identifica el manejador de errores porque recibe cuatro parámetros.
// eslint-disable-next-line no-unused-vars
export function manejarErrores(error, req, res, next) {
	if (error instanceof ErrorDeServicio) {
		return res.status(error.estado).json({ error: error.message, campo: error.campo, ...error.extras });
	}
	if (error.type === 'entity.parse.failed') {
		return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido', campo: null });
	}
	if (error.type === 'entity.too.large') {
		return res.status(413).json({ error: 'El archivo supera el tamaño permitido', campo: null });
	}
	console.error(error);
	return res.status(500).json({ error: 'Error interno del servidor', campo: null });
}
