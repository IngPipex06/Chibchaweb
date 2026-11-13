import { Router } from 'express';
import { ejecutarCierre, exportarCheque } from '../../servicios/facturacion/ServicioDeCierreMensual.js';
import { generarFactura } from '../../servicios/facturacion/ServicioDeFacturacion.js';
import { exigirSesion } from '../middleware/autenticacion.js';
import { exigirPermiso } from '../middleware/autorizacion.js';

export const rutasDeFacturacion = Router();
rutasDeFacturacion.use(exigirSesion);

rutasDeFacturacion.post('/facturas', exigirPermiso('GenerarFactura'), async (req, res) => {
	res.status(201).json(await generarFactura(req.body ?? {}));
});

rutasDeFacturacion.post('/cierres', exigirPermiso('EjecutarCierreMensual'), async (req, res) => {
	res.status(201).json(await ejecutarCierre(req.body ?? {}));
});

rutasDeFacturacion.get('/cheques/:id/pdf', exigirPermiso('EjecutarCierreMensual'), async (req, res) => {
	const { número, contenido } = await exportarCheque(req.params.id);
	res.type('application/pdf').attachment(`${número}.pdf`).send(contenido);
});
