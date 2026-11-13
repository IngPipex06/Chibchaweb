import { Router } from 'express';
import { ErrorDeServicio } from '../../servicios/ErrorDeServicio.js';
import {
	abrirTicket,
	anotarAvance,
	escalarTicket,
	listarSitios,
	listarTicketsDelTitular,
	resolverTicket,
	tomarTicket,
	verTablero,
} from '../../servicios/soporte/ServicioDeTickets.js';
import { exigirSesion } from '../middleware/autenticacion.js';
import { exigirTécnico, exigirTitular } from '../middleware/autorizacion.js';

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const rutasDeSoporte = Router();
rutasDeSoporte.use(exigirSesion);
rutasDeSoporte.param('id', (req, res, next, id) => {
	if (!FORMATO_UUID.test(id)) throw new ErrorDeServicio(404, 'El ticket no existe');
	next();
});

rutasDeSoporte.get('/sitios', exigirTitular, async (req, res) => {
	res.json(await listarSitios(req.usuarioId));
});
rutasDeSoporte.get('/tickets', exigirTitular, async (req, res) => {
	res.json(await listarTicketsDelTitular(req.usuarioId));
});
rutasDeSoporte.post('/tickets', exigirTitular, async (req, res) => {
	res.status(201).json(await abrirTicket(req.usuarioId, req.body ?? {}));
});
rutasDeSoporte.get('/tablero', exigirTécnico, async (req, res) => {
	res.json(await verTablero(req.usuario, req.query));
});
rutasDeSoporte.post('/tickets/:id/toma', exigirTécnico, async (req, res) => {
	res.json(await tomarTicket(req.usuario, req.params.id));
});
rutasDeSoporte.post('/tickets/:id/resolucion', exigirTécnico, async (req, res) => {
	res.json(await resolverTicket(req.usuario, req.params.id, req.body ?? {}));
});
rutasDeSoporte.post('/tickets/:id/escalamiento', exigirTécnico, async (req, res) => {
	res.json(await escalarTicket(req.usuario, req.params.id, req.body ?? {}));
});
rutasDeSoporte.put('/tickets/:id/nota', exigirTécnico, async (req, res) => {
	res.json(await anotarAvance(req.usuario, req.params.id, req.body ?? {}));
});
