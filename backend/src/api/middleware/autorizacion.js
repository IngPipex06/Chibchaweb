import { Administrador } from '../../dominio/usuarios/Administrador.js';
import { Cliente } from '../../dominio/usuarios/Cliente.js';
import { Titular } from '../../dominio/usuarios/Titular.js';
import { ErrorDeServicio } from '../../servicios/ErrorDeServicio.js';
import { cargarUsuarioDeSesion } from '../../servicios/usuarios/ServicioDeAutenticacion.js';

export async function exigirAdministrador(req, res, next) {
	const usuario = await cargarUsuarioDeSesion(req.usuarioId);
	if (!(usuario instanceof Administrador)) {
		throw new ErrorDeServicio(403, 'No tiene permiso para esta operación');
	}
	req.usuario = usuario;
	next();
}

export async function exigirCliente(req, res, next) {
	const usuario = await cargarUsuarioDeSesion(req.usuarioId);
	if (!(usuario instanceof Cliente)) {
		throw new ErrorDeServicio(403, 'No tiene permiso para esta operación');
	}
	req.usuario = usuario;
	next();
}

export async function exigirTitular(req, res, next) {
	const usuario = await cargarUsuarioDeSesion(req.usuarioId);
	if (!(usuario instanceof Titular)) {
		throw new ErrorDeServicio(403, 'No tiene permiso para esta operación');
	}
	req.usuario = usuario;
	next();
}

export function exigirPermiso(nombrePermiso) {
	return async (req, res, next) => {
		const usuario = await cargarUsuarioDeSesion(req.usuarioId);
		if (!(usuario instanceof Administrador) || !usuario.rol.tienePermiso(nombrePermiso)) {
			throw new ErrorDeServicio(403, 'No tiene permiso para esta operación');
		}
		next();
	};
}
