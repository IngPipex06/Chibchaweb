import { pool } from '../src/config/baseDeDatos.js';
import { crearAdministrador } from '../src/servicios/usuarios/ServicioDeUsuarios.js';

try {
	const id = await crearAdministrador({
		correo: process.env.ADMIN_CORREO,
		contraseña: process.env.ADMIN_CONTRASENA,
		nombreCompleto: process.env.ADMIN_NOMBRE,
		documento: process.env.ADMIN_DOCUMENTO,
		rol: process.env.ADMIN_ROL,
	});
	console.log(`Administrador creado: ${id}`);
} catch (error) {
	console.error(error.campo ? `${error.campo}: ${error.message}` : error.message);
	process.exitCode = 1;
} finally {
	await pool.end();
}
