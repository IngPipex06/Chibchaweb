import { Router } from 'express';
import * as ServicioDeAutenticacion from '../../servicios/usuarios/ServicioDeAutenticacion.js';
import * as ServicioDeUsuarios from '../../servicios/usuarios/ServicioDeUsuarios.js';
import { exigirSesion } from '../middleware/autenticacion.js';

export const rutasDeUsuarios = Router();

rutasDeUsuarios.post('/registro', async (req, res) => {
	const resultado = await ServicioDeUsuarios.registrarCliente(req.body ?? {});
	res.status(resultado.pendienteDeReconciliacion ? 202 : 201).json(resultado);
});

rutasDeUsuarios.post('/sesion', async (req, res) => {
	res.json(await ServicioDeAutenticacion.iniciarSesion(req.body ?? {}));
});

rutasDeUsuarios.post('/recuperacion/pregunta', async (req, res) => {
	res.json(await ServicioDeAutenticacion.obtenerPreguntaDeSeguridad(req.body ?? {}));
});

rutasDeUsuarios.post('/recuperacion', async (req, res) => {
	await ServicioDeAutenticacion.recuperarContraseña(req.body ?? {});
	res.status(204).end();
});

rutasDeUsuarios.get('/perfil', exigirSesion, async (req, res) => {
	res.json(await ServicioDeAutenticacion.obtenerPerfil(req.usuarioId));
});
