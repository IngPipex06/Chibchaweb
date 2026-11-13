import { Router } from 'express';
import { ErrorDeServicio } from '../../servicios/ErrorDeServicio.js';
import {
	agregarMedio,
	ejecutarCobros,
	eliminarMedio,
	exportarComprobante,
	listarComprobantes,
	listarMedios,
	listarOpciones,
	modificarMedio,
	obtenerComprobante,
} from '../../servicios/pagos/ServicioDePagos.js';
import { exigirSesion } from '../middleware/autenticacion.js';
import { exigirPermiso, exigirTitular } from '../middleware/autorizacion.js';

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const rutasDePagos = Router();
rutasDePagos.use(exigirSesion);

rutasDePagos.post('/cobros', exigirPermiso('GenerarFactura'), async (req, res) => {
	res.status(201).json(await ejecutarCobros());
});

rutasDePagos.use(exigirTitular);
rutasDePagos.param('id', (req, res, next, id) => {
	if (!FORMATO_UUID.test(id)) throw new ErrorDeServicio(404, 'El registro no existe');
	next();
});

rutasDePagos.get('/', (req, res) => {
	res.json(listarOpciones());
});

rutasDePagos.get('/medios', async (req, res) => {
	res.json(await listarMedios(req.usuarioId));
});
rutasDePagos.post('/medios', async (req, res) => {
	const resultado = await agregarMedio(req.usuarioId, req.body ?? {});
	res.status(resultado.pendienteDeReconciliacion ? 202 : 201).json(resultado);
});
rutasDePagos.put('/medios/:id', async (req, res) => {
	const resultado = await modificarMedio(req.usuarioId, req.params.id, req.body ?? {});
	res.status(resultado.pendienteDeReconciliacion ? 202 : 200).json(resultado);
});
rutasDePagos.delete('/medios/:id', async (req, res) => {
	await eliminarMedio(req.usuario, req.params.id);
	res.status(204).end();
});

rutasDePagos.get('/comprobantes', async (req, res) => {
	res.json(await listarComprobantes(req.usuarioId));
});
rutasDePagos.get('/comprobantes/:id', async (req, res) => {
	res.json(await obtenerComprobante(req.usuarioId, req.params.id));
});
rutasDePagos.get('/comprobantes/:id/recibo', async (req, res) => {
	const { factura, contenido } = await exportarComprobante(req.usuarioId, req.params.id);
	res.type('application/pdf').attachment(`comprobante-${factura}.pdf`).send(contenido);
});
