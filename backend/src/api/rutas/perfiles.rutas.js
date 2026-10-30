import { Router } from 'express';
import { ErrorDeServicio } from '../../servicios/ErrorDeServicio.js';
import { clientes, distribuidores, listarGestiones, personal } from '../../servicios/perfiles/ServicioDePerfiles.js';
import { exigirSesion } from '../middleware/autenticacion.js';
import { exigirAdministrador, exigirPermiso } from '../middleware/autorizacion.js';

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function crearRutasDeGestion(servicio, permiso) {
	const rutas = Router();
	rutas.use(exigirPermiso(permiso));
	rutas.param('id', (req, res, next, id) => {
		if (!FORMATO_UUID.test(id)) throw new ErrorDeServicio(404, 'El perfil no existe');
		next();
	});

	rutas.get('/', async (req, res) => {
		res.json(await servicio.listar(req.query.buscar));
	});
	rutas.get('/:id', async (req, res) => {
		res.json(await servicio.obtener(req.params.id));
	});
	rutas.post('/', async (req, res) => {
		const resultado = await servicio.crear(req.body ?? {});
		res.status(resultado.pendienteDeReconciliacion ? 202 : 201).json(resultado);
	});
	rutas.put('/:id', async (req, res) => {
		const resultado = await servicio.editar(req.params.id, req.body ?? {}, req.usuarioId);
		res.status(resultado.pendienteDeReconciliacion ? 202 : 200).json(resultado);
	});
	rutas.post('/:id/inhabilitar', async (req, res) => {
		await servicio.inhabilitar(req.params.id, req.usuarioId);
		res.status(204).end();
	});
	return rutas;
}

export const rutasDePerfiles = Router();
rutasDePerfiles.use(exigirSesion);

rutasDePerfiles.get('/gestiones', exigirAdministrador, (req, res) => {
	res.json(listarGestiones(req.usuario.rol.permisos.map((permiso) => permiso.nombre)));
});

const rutasDeClientes = crearRutasDeGestion(clientes, 'GestionarPerfilDeClientes');
rutasDeClientes.post('/:id/reactivar', async (req, res) => {
	await clientes.reactivar(req.params.id);
	res.status(204).end();
});

rutasDePerfiles.use('/clientes', rutasDeClientes);
rutasDePerfiles.use('/personal', crearRutasDeGestion(personal, 'GestionarPerfilDePersonalInterno'));
rutasDePerfiles.use('/distribuidores', crearRutasDeGestion(distribuidores, 'GestionarPerfilDeDistribuidores'));
