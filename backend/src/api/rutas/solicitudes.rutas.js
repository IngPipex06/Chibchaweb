import { Router } from 'express';
import { ErrorDeServicio } from '../../servicios/ErrorDeServicio.js';
import {
	enviarSolicitud,
	exportarXML,
	listarSolicitudes,
	obtenerSolicitud,
	solicitarDominio,
} from '../../servicios/solicitudes/ServicioDeSolicitudes.js';
import { exigirSesion } from '../middleware/autenticacion.js';
import { exigirCliente } from '../middleware/autorizacion.js';

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const rutasDeSolicitudes = Router();
rutasDeSolicitudes.use(exigirSesion, exigirCliente);
rutasDeSolicitudes.param('id', (req, res, next, id) => {
	if (!FORMATO_UUID.test(id)) throw new ErrorDeServicio(404, 'La solicitud no existe');
	next();
});

rutasDeSolicitudes.get('/', async (req, res) => {
	res.json(await listarSolicitudes(req.usuarioId));
});
rutasDeSolicitudes.post('/', async (req, res) => {
	res.status(201).json(await solicitarDominio(req.usuario, req.body ?? {}));
});
rutasDeSolicitudes.get('/:id', async (req, res) => {
	res.json(await obtenerSolicitud(req.usuarioId, req.params.id));
});
rutasDeSolicitudes.get('/:id/xml', async (req, res) => {
	const { nombre, contenido } = await exportarXML(req.usuarioId, req.params.id);
	res.type('application/xml').attachment(`solicitud-${nombre}.xml`).send(contenido);
});
rutasDeSolicitudes.post('/:id/envio', async (req, res) => {
	res.json(await enviarSolicitud(req.usuarioId, req.params.id));
});
