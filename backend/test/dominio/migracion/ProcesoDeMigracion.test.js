import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EstadoMigración } from '../../../src/dominio/migracion/EstadoMigracion.js';
import { ProcesoDeMigración } from '../../../src/dominio/migracion/ProcesoDeMigracion.js';

const ENCABEZADO = 'ID_Cliente_Legado,Nombre,Dominio,Plan de Hosting,Estado,Tarjeta,Correo';
const fila = (n) => `L-${n},Ana,a${n}.co,Chibcha-Oro/Unix/Anual,Activo,4111111111111111|12/2099,a${n}@prueba.com`;
const archivo = (...filas) => Buffer.from([ENCABEZADO, ...filas].join('\n'));
const sinCotejo = (registro, vistos) => ({ idYaMigrado: vistos.ids.has(registro.idClienteLegado) });

test('E1: una falla estructural revierte sin cargar registros', () => {
	const proceso = new ProcesoDeMigración();
	proceso.ejecutar(Buffer.from('basura'));
	assert.equal(proceso.estado, EstadoMigración.RevertidoPorErrorEstructural);
	assert.deepEqual(proceso.siguienteBloque(10), []);
});

test('clasifica válidos, repetidos del archivo y fallidos, y avanza la posición', () => {
	const proceso = new ProcesoDeMigración();
	proceso.ejecutar(archivo(fila(1), fila(1), 'L-9,Ana'));
	const clasificado = proceso.clasificarBloque(proceso.siguienteBloque(10), sinCotejo, '2026-10-30');
	assert.equal(clasificado.válidos.length, 1);
	assert.equal(clasificado.duplicados, 1);
	assert.equal(clasificado.entradas.length, 1);
	assert.match(clasificado.entradas[0].motivo, /^Línea 4, registro L-9: esquema/);
	assert.equal(proceso.posiciónActual, 3);
});

test('Memento: reanudar sigue desde el punto y no repite lo procesado', () => {
	const proceso = new ProcesoDeMigración();
	proceso.ejecutar(archivo(fila(1), fila(2), fila(3)));
	proceso.clasificarBloque(proceso.siguienteBloque(2), sinCotejo, '2026-10-30');
	const punto = proceso.pausarYGuardarPunto('2026-10-30');
	assert.equal(proceso.estado, EstadoMigración.Pausado);
	assert.equal(punto.posición, 2);
	proceso.reanudarDesde(punto);
	assert.equal(proceso.estado, EstadoMigración.EnProgreso);
	assert.deepEqual(proceso.siguienteBloque(10).map((r) => r.idClienteLegado), ['L-3']);
});

test('solo se pausa una migración en curso', () => {
	const proceso = new ProcesoDeMigración({ estado: EstadoMigración.Completado });
	assert.throws(() => proceso.pausarYGuardarPunto('2026-10-30'));
});
