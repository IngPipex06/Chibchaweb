import { ErrorDeServicio } from '../../servicios/ErrorDeServicio.js';
import { verificarToken } from '../../servicios/usuarios/ServicioDeAutenticacion.js';

export function exigirSesion(req, res, next) {
	const [esquema, token] = (req.headers.authorization ?? '').split(' ');
	if (esquema !== 'Bearer' || !token) {
		throw new ErrorDeServicio(401, 'Se requiere iniciar sesión');
	}
	req.usuarioId = verificarToken(token);
	next();
}
