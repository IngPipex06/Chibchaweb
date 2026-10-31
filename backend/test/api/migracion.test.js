import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, mock, test } from 'node:test';

const carpeta = await mkdtemp(join(tmpdir(), 'chibchaweb-'));
process.env.RUTA_RESPALDO = join(carpeta, 'contingencia.jsonl');

const { app } = await import('../../src/app.js');
const { pool } = await import('../../src/config/baseDeDatos.js');
const { aplicadoresDeRespaldoDeMigracion } = await import('../../src/servicios/migracion/ServicioDeMigracion.js');
const { reconciliar } = await import('../../src/servicios/respaldo/ServicioDeContingencia.js');
const { crearAdministrador } = await import('../../src/servicios/usuarios/ServicioDeUsuarios.js');

const CLAVE = 'clave-segura';
const ENCABEZADO = 'ID_Cliente_Legado,Nombre,Dominio,Plan de Hosting,Estado,Tarjeta,Correo';
const correoAdmin = `${randomUUID()}@prueba.com`;
const procesos = [];
const ids = [];
let servidor;
let base;
let token;

function fila(sufijo = randomUUID().slice(0, 12)) {
	ids.push(`L-${sufijo}`);
	return `L-${sufijo},Ana Legada,${sufijo}.co,Chibcha-Plata/Unix/Trimestral,Activo,4111111111111111|12/2099,${sufijo}@prueba.com`;
}

const archivo = (...filas) => [ENCABEZADO, ...filas].join('\n');

async function pedir(metodo, ruta, cuerpo, tipo = 'text/csv') {
	const respuesta = await fetch(`${base}/api${ruta}`, {
		method: metodo,
		headers: { 'Content-Type': tipo, Authorization: `Bearer ${token}` },
		body: cuerpo,
	});
	const texto = await respuesta.text();
	const resultado = { estado: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
	if (resultado.cuerpo?.id && !procesos.includes(resultado.cuerpo.id)) procesos.push(resultado.cuerpo.id);
	return resultado;
}

const migrar = (contenido) => pedir('POST', '/migraciones?nombreArchivo=legado.csv', contenido);

async function clienteDe(id) {
	const { rows } = await pool.query(
		`SELECT c."id", c."tipoDocumento", c."paqueteHosting", c."planDePago", u."correo", u."contraseña",
			u."estado", m."numeroEnmascarado", m."fechaExpiración"::text AS expira, d."nombre" AS dominio
		FROM cliente c
		JOIN usuario u ON u."id" = c."id"
		JOIN medio_de_pago m ON m."titularId" = c."id"
		JOIN dominio d ON d."clienteId" = c."id"
		WHERE c."numeroDocumento" = $1`,
		[id],
	);
	return rows;
}

before(async () => {
	await new Promise((resolver) => {
		servidor = app.listen(0, resolver);
	});
	base = `http://127.0.0.1:${servidor.address().port}`;
	await crearAdministrador({
		correo: correoAdmin,
		contraseña: CLAVE,
		nombreCompleto: 'Admin Migración',
		documento: randomUUID().slice(0, 30),
		rol: 'Administrador de Clientes',
	});
	const sesion = await fetch(`${base}/api/usuarios/sesion`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ correo: correoAdmin, contraseña: CLAVE }),
	});
	token = (await sesion.json()).token;
});

after(async () => {
	const { rows } = await pool.query('SELECT "id" FROM cliente WHERE "numeroDocumento" = ANY($1)', [ids]);
	const clientes = rows.map((r) => r.id);
	await pool.query('DELETE FROM dominio WHERE "clienteId" = ANY($1)', [clientes]);
	await pool.query('DELETE FROM medio_de_pago WHERE "titularId" = ANY($1)', [clientes]);
	await pool.query('DELETE FROM cliente WHERE "id" = ANY($1)', [clientes]);
	await pool.query('DELETE FROM usuario WHERE "id" = ANY($1)', [clientes]);
	await pool.query('DELETE FROM entrada_de_inconsistencia WHERE "procesoMigracionId" = ANY($1)', [procesos]);
	await pool.query('DELETE FROM proceso_de_migracion WHERE "id" = ANY($1)', [procesos]);
	const { rows: admin } = await pool.query('SELECT "id" FROM usuario WHERE "correo" = $1', [correoAdmin]);
	await pool.query('DELETE FROM administrador WHERE "id" = $1', [admin[0].id]);
	await pool.query('DELETE FROM empleado WHERE "id" = $1', [admin[0].id]);
	await pool.query('DELETE FROM usuario WHERE "id" = $1', [admin[0].id]);
	await new Promise((resolver) => {
		servidor.close(resolver);
	});
	await pool.end();
	await rm(carpeta, { recursive: true, force: true });
});

test('sin permiso no se migra y el archivo es obligatorio', async () => {
	const sinSesion = await fetch(`${base}/api/migraciones?nombreArchivo=a.csv`, { method: 'POST' });
	assert.equal(sinSesion.status, 401);
	assert.equal((await pedir('POST', '/migraciones?nombreArchivo=a.csv', '{}', 'application/json')).estado, 400);
	assert.equal((await migrar(undefined)).estado, 400);
	assert.equal((await pedir('POST', '/migraciones', archivo(fila()))).estado, 400);
	assert.equal((await pedir('GET', '/migraciones/no-existe/inconsistencias')).estado, 404);
});

test('UC26: migra cliente, tarjeta enmascarada y dominio, y resume', async () => {
	const texto = fila();
	const id = ids.at(-1);
	const { estado, cuerpo } = await migrar(archivo(texto));
	assert.equal(estado, 201);
	assert.equal(cuerpo.estado, 'Completado');
	assert.equal(cuerpo.migrados, 1);
	const [cliente] = await clienteDe(id);
	assert.equal(cliente.tipoDocumento, 'Legado');
	assert.equal(cliente.paqueteHosting, 'Chibcha-Plata');
	assert.equal(cliente.planDePago, 'Trimestral');
	assert.equal(cliente.numeroEnmascarado, '************1111');
	assert.equal(cliente.expira, '2099-12-31');
	assert.equal(cliente.dominio, `${id.slice(2)}.co`);
});

test('el cliente migrado reclama su cuenta con UC3 sin tocar sus datos', async () => {
	const texto = fila();
	const id = ids.at(-1);
	const correo = `${id.slice(2)}@prueba.com`;
	await migrar(archivo(texto));
	const antes = (await clienteDe(id))[0];

	const pregunta = await pedir('POST', '/usuarios/recuperacion/pregunta', JSON.stringify({ correo }), 'application/json');
	assert.match(pregunta.cuerpo.pregunta, /ID de cliente anterior/);
	const solicitud = { correo, nuevaContraseña: 'mi-clave-nueva' };
	const recuperar = (respuesta) =>
		pedir('POST', '/usuarios/recuperacion', JSON.stringify({ ...solicitud, respuesta }), 'application/json');
	assert.equal((await recuperar('otra')).estado, 401);
	assert.equal((await recuperar(`${id}1111`)).estado, 204);

	const sesion = await pedir('POST', '/usuarios/sesion', JSON.stringify({ correo, contraseña: 'mi-clave-nueva' }), 'application/json');
	assert.equal(sesion.estado, 200);
	const { contraseña: nueva, ...despues } = (await clienteDe(id))[0];
	const { contraseña: vieja, ...sinClave } = antes;
	assert.notEqual(nueva, vieja);
	assert.deepEqual(despues, sinClave);
});

test('el tope de intentos frena la adivinanza de la respuesta', async () => {
	const texto = fila();
	const id = ids.at(-1);
	const correo = `${id.slice(2)}@prueba.com`;
	await migrar(archivo(texto));
	const recuperar = (respuesta) =>
		pedir('POST', '/usuarios/recuperacion', JSON.stringify({ correo, nuevaContraseña: 'mi-clave-nueva', respuesta }), 'application/json');
	for (let intento = 0; intento < 5; intento += 1) assert.equal((await recuperar('mal')).estado, 401);
	assert.equal((await recuperar(`${id}1111`)).estado, 429);
});

test('UC26 E1: falla estructural sin registros insertados', async () => {
	const texto = fila();
	const { estado, cuerpo } = await migrar(`otro,encabezado\n${texto}`);
	assert.equal(estado, 422);
	assert.equal(cuerpo.estado, 'RevertidoPorErrorEstructural');
	assert.deepEqual(await clienteDe(ids.at(-1)), []);
});

test('UC26 A1, A2 y UC28: reporta, omite y sigue; el reporte no lleva la tarjeta', async () => {
	const buena = fila();
	const buenaId = ids.at(-1);
	const mala = `L-mala-${randomUUID().slice(0, 8)},Ana,x.co,Chibcha-Bronce/Unix/Anual,Activo,4111111111111111|12/2099,correo-malo`;
	const { cuerpo } = await migrar(archivo(buena, mala, buena));
	assert.equal(cuerpo.migrados, 1);
	assert.equal(cuerpo.duplicados, 1);
	assert.equal(cuerpo.inconsistencias, 1);

	const reporte = await pedir('GET', `/migraciones/${cuerpo.id}/inconsistencias`);
	assert.equal(reporte.cuerpo.nombreArchivo, 'legado.csv');
	assert.equal(reporte.cuerpo.administrador, 'Admin Migración');
	assert.equal(reporte.cuerpo.entradas.length, 1);
	assert.match(reporte.cuerpo.entradas[0].motivo, /^Línea 3, registro L-mala/);
	assert.ok(!reporte.cuerpo.entradas[0].registroOriginal.includes('4111111111111111'));

	const repetida = await migrar(archivo(buena));
	assert.equal(repetida.cuerpo.migrados, 0);
	assert.equal(repetida.cuerpo.duplicados, 1);
	assert.equal((await clienteDe(buenaId)).length, 1);
});

test('correo de un cliente ya registrado va al reporte, no se omite', async () => {
	const primera = fila();
	const correo = `${ids.at(-1).slice(2)}@prueba.com`;
	await migrar(archivo(primera));
	const segunda = fila().replace(/[^,]+$/, correo);
	const { cuerpo } = await migrar(archivo(segunda));
	assert.equal(cuerpo.migrados, 0);
	assert.equal(cuerpo.inconsistencias, 1);
});

test('UC26 A3 y E2: pausa tras el bloque, rechaza archivo alterado y reanuda sin repetir', async () => {
	const filas = Array.from({ length: 101 }, () => fila());
	const corrida = migrar(archivo(...filas));
	await new Promise((resolver) => {
		setTimeout(resolver, 100);
	});
	const { rows } = await pool.query(
		`SELECT "id" FROM proceso_de_migracion WHERE "estado" = 'EnProgreso' ORDER BY "id" DESC`,
	);
	const pausa = await Promise.any(rows.map(async ({ id }) => {
		const intento = await pedir('POST', `/migraciones/${id}/pausar`);
		if (intento.estado !== 200) throw new Error('no estaba en curso');
		return intento;
	}));
	assert.equal(pausa.cuerpo.estado, 'Pausado');
	const { cuerpo: resumen } = await corrida;
	assert.equal(resumen.estado, 'Pausado');
	assert.equal(resumen.migrados, 100);

	const reanudar = (contenido) => pedir('POST', `/migraciones/${resumen.id}/reanudar`, contenido);
	const alterado = await reanudar(archivo(fila(), ...filas.slice(1)));
	assert.equal(alterado.estado, 409);
	assert.equal((await reanudar(archivo(filas[0]))).estado, 409);

	const final = await reanudar(archivo(...filas));
	assert.equal(final.estado, 200);
	assert.equal(final.cuerpo.estado, 'Completado');
	assert.equal(final.cuerpo.migrados, 1);
	assert.equal((await pedir('POST', `/migraciones/${resumen.id}/pausar`)).estado, 409);
});

test('UC26 E3: con la base caída respalda cifrado, y reconciliar inserta y pausa', async () => {
	const original = pool.connect;
	const caida = mock.method(pool, 'connect', function (...argumentos) {
		if (argumentos.length > 0) return original.apply(this, argumentos);
		return Promise.reject(Object.assign(new Error('caída simulada'), { code: 'ECONNREFUSED' }));
	});
	const texto = fila();
	const id = ids.at(-1);
	const { estado, cuerpo } = await migrar(archivo(texto));
	caida.mock.restore();
	assert.equal(estado, 202);
	assert.equal(cuerpo.pendienteDeReconciliacion, true);
	assert.deepEqual(await clienteDe(id), []);
	const respaldo = await readFile(process.env.RUTA_RESPALDO, 'utf8');
	assert.ok(!respaldo.includes(`${id.slice(2)}@prueba.com`));

	assert.deepEqual(await reconciliar(aplicadoresDeRespaldoDeMigracion), { aplicados: 1, pendientes: 0 });
	assert.equal((await clienteDe(id)).length, 1);
	const { rows } = await pool.query('SELECT "estado", "ultimoPuntoControlPosicion" FROM proceso_de_migracion WHERE "id" = $1', [cuerpo.id]);
	assert.deepEqual(rows[0], { estado: 'Pausado', ultimoPuntoControlPosicion: 1 });
	const final = await pedir('POST', `/migraciones/${cuerpo.id}/reanudar`, archivo(texto));
	assert.equal(final.cuerpo.estado, 'Completado');
});
