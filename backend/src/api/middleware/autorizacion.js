import {
	cargarAdministrador,
	cargarAdministradorConPermiso,
	cargarCliente,
	cargarTécnico,
	cargarTitular,
} from '../../servicios/usuarios/ServicioDeAutenticacion.js';

function exigirUsuario(cargar) {
	return async (req, res, next) => {
		req.usuario = await cargar(req.usuarioId);
		next();
	};
}

export const exigirAdministrador = exigirUsuario(cargarAdministrador);
export const exigirCliente = exigirUsuario(cargarCliente);
export const exigirTécnico = exigirUsuario(cargarTécnico);
export const exigirTitular = exigirUsuario(cargarTitular);

export function exigirPermiso(nombrePermiso) {
	return async (req, res, next) => {
		await cargarAdministradorConPermiso(req.usuarioId, nombrePermiso);
		next();
	};
}
