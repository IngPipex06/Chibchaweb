import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ArchivoXML } from '../../../src/dominio/solicitudes/ArchivoXML.js';
import { EstadoSolicitudDominio } from '../../../src/dominio/solicitudes/EstadoSolicitudDominio.js';
import { SolicitudDeDominio } from '../../../src/dominio/solicitudes/SolicitudDeDominio.js';
import { Cliente } from '../../../src/dominio/usuarios/Cliente.js';

const cliente = new Cliente({ correo: 'a@b.co', nombreCompleto: 'Ana', tipoDocumento: 'CC', numeroDocumento: '1' });

test('generarXML deja el archivo en la solicitud, con su versión de formato', () => {
	const solicitud = new SolicitudDeDominio({
		id: 'abc',
		cliente,
		nombreDominioSolicitado: 'misitio.com',
		fechaSolicitud: '2026-10-30',
	});
	const archivo = solicitud.generarXML();
	assert.equal(solicitud.archivoXML, archivo);
	assert.equal(archivo.formatoVersión, '1.0');
	assert.match(archivo.contenido, /<periodo unidad="anios">1<\/periodo>/);
});

test('generarXML exige una solicitud guardada y completa', () => {
	assert.throws(() => new SolicitudDeDominio({ cliente }).generarXML());
});

test('simularEnvío deja la solicitud Enviada', () => {
	const solicitud = new SolicitudDeDominio({ archivoXML: new ArchivoXML({ contenido: '<a/>' }) });
	solicitud.simularEnvío();
	assert.equal(solicitud.estado, EstadoSolicitudDominio.Enviada);
});
