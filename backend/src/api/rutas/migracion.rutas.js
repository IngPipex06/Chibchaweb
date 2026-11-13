import express, { Router } from 'express';
import {
	iniciarMigracion,
	obtenerReporte,
	pausarMigracion,
	reanudarMigracion,
} from '../../servicios/migracion/ServicioDeMigracion.js';
import { ErrorDeServicio } from '../../servicios/ErrorDeServicio.js';
import { exigirSesion } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/autorizacion.js';

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const leerArchivo = express.raw({ type: 'text/csv', limit: '5mb' });

export const rutasDeMigracion = Router();
rutasDeMigracion.use(exigirSesion, exigirPermiso('MigrarDatosLegados'));

rutasDeMigracion.param('id', (req, res, next, id) => {
	if (!FORMATO_UUID.test(id)) throw new ErrorDeServicio(404, 'La migración no existe');
	next();
});

rutasDeMigracion.post('/', leerArchivo, async (req, res) => {
	const resultado = await iniciarMigracion({
		archivo: req.body,
		nombreArchivo: req.query.nombreArchivo,
		administradorId: req.usuarioId,
	});
	res.status(resultado.pendienteDeReconciliacion ? 202 : 201).json(resultado);
});

rutasDeMigracion.post('/:id/pausar', async (req, res) => {
	res.json(await pausarMigracion(req.params.id));
});

rutasDeMigracion.post('/:id/reanudar', leerArchivo, async (req, res) => {
	const resultado = await reanudarMigracion(req.params.id, req.body);
	res.status(resultado.pendienteDeReconciliacion ? 202 : 200).json(resultado);
});

rutasDeMigracion.get('/:id/inconsistencias', async (req, res) => {
	res.json(await obtenerReporte(req.params.id));
});
