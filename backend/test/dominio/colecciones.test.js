import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CierreMensual } from '../../src/dominio/facturacion/CierreMensual.js';
import { GestorDeRespaldoCifrado } from '../../src/dominio/respaldo/GestorDeRespaldoCifrado.js';
import { Rol } from '../../src/dominio/usuarios/Rol.js';

test('agrega y quita elementos de las colecciones', () => {
	const permiso = { nombre: 'Gestionar' };
	const rol = new Rol({ permisos: [] });
	rol.agregarPermiso(permiso);
	assert.equal(rol.tienePermiso('Gestionar'), true);
	rol.quitarPermiso(permiso);
	assert.equal(rol.tienePermiso('Gestionar'), false);

	for (const [objeto, sufijo] of [
		[new CierreMensual(), 'Comisión'],
		[new GestorDeRespaldoCifrado(), 'ArchivoDeRespaldo'],
	]) {
		assert.doesNotThrow(() => {
			objeto[`agregar${sufijo}`]({});
			objeto[`quitar${sufijo}`]({});
		});
	}
});
