import { randomBytes } from 'node:crypto';
import { enTransaccion, esCaidaDeBase } from '../../config/baseDeDatos.js';
import { generarHash } from '../../config/hash.js';
import * as ClienteGateway from '../../datos/gateways/ClienteGateway.js';
import * as DominioGateway from '../../datos/gateways/DominioGateway.js';
import * as EntradaDeInconsistenciaGateway from '../../datos/gateways/EntradaDeInconsistenciaGateway.js';
import * as MedioDePagoGateway from '../../datos/gateways/MedioDePagoGateway.js';
import * as ProcesoDeMigracionGateway from '../../datos/gateways/ProcesoDeMigracionGateway.js';
import * as UsuarioGateway from '../../datos/gateways/UsuarioGateway.js';
import { formatearFecha } from '../../dominio/facturacion/Factura.js';
import { EstadoMigración } from '../../dominio/migracion/EstadoMigracion.js';
import { ProcesoDeMigración } from '../../dominio/migracion/ProcesoDeMigracion.js';
import { PuntoDeControlMigración } from '../../dominio/migracion/PuntoDeControlMigracion.js';
import { RegistroLegado } from '../../dominio/migracion/RegistroLegado.js';
import { OrigenRespaldo } from '../../dominio/respaldo/OrigenRespaldo.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { respaldarEnArchivo } from '../respaldo/ServicioDeContingencia.js';
import { exigirTexto } from '../usuarios/validacion.js';

const TAMAÑO_DE_BLOQUE = 100;
const TIPO_DOCUMENTO_LEGADO = 'Legado';
// El cliente reclama su cuenta con UC3: la contraseña migrada es aleatoria y nadie la conoce.
const PREGUNTA_DE_RECLAMO = 'Escriba su ID de cliente anterior seguido de los últimos 4 dígitos de su tarjeta';
const ALERTA_DE_CONTINGENCIA =
	'La base de datos no está disponible: la migración queda pausada y el bloque en curso respaldado para reconciliar';
const VIOLACION_DE_UNICIDAD = '23505';
const MOTIVO_DE_CONFLICTO = 'duplicado: correo, documento o dominio ya registrados';

// Una sola corrida a la vez, y una en curso no se reanuda. En memoria: si el proceso cae, queda reanudable.
const enCurso = new Set();

const hoy = () => formatearFecha(new Date());

function exigirArchivo(archivo) {
	if (!Buffer.isBuffer(archivo) || archivo.length === 0) {
		throw new ErrorDeServicio(400, 'Debe cargar el archivo legado en formato CSV', 'archivo');
	}
}

async function enPuntoDeGuardado(conexion, trabajo) {
	await conexion.query('SAVEPOINT registro');
	try {
		await trabajo();
		await conexion.query('RELEASE SAVEPOINT registro');
	} catch (error) {
		if (esCaidaDeBase(error)) throw error;
		await conexion.query('ROLLBACK TO SAVEPOINT registro');
		throw error;
	}
}

async function insertarCliente({ cuenta, cliente, tarjeta, dominio }, conexion) {
	const id = await UsuarioGateway.insertar(cuenta, conexion);
	await ClienteGateway.insertar({ ...cliente, id }, conexion);
	await MedioDePagoGateway.insertar({ ...tarjeta, titularId: id }, conexion);
	await DominioGateway.insertar({ nombre: dominio, clienteId: id }, conexion);
}

/** Un bloque y su punto de avance son una transacción: nunca se separan. Lo mismo aplica al reconciliar. */
async function guardarBloque({ procesoId, clientes, entradas, punto }) {
	const resultado = { migrados: 0, conflictos: [], retenidas: [] };
	await enTransaccion(async (conexion) => {
		for (const nuevo of clientes) {
			try {
				await enPuntoDeGuardado(conexion, () => insertarCliente(nuevo, conexion));
				resultado.migrados += 1;
			} catch (error) {
				if (error.code !== VIOLACION_DE_UNICIDAD) throw error;
				resultado.conflictos.push(nuevo.conflicto);
			}
		}
		for (const entrada of [...entradas, ...resultado.conflictos]) {
			try {
				await enPuntoDeGuardado(conexion, () =>
					EntradaDeInconsistenciaGateway.insertar({ ...entrada, procesoMigracionId: procesoId }, conexion),
				);
			} catch (error) {
				// UC28 E1: el registro igual se descarta; la entrada queda en el resumen.
				if (esCaidaDeBase(error)) throw error;
				resultado.retenidas.push(entrada);
			}
		}
		await ProcesoDeMigracionGateway.guardarPunto(procesoId, punto, conexion);
	});
	return resultado;
}

/** UC27 regla 4: lo que ya está en la base, para que cada registro se coteje. */
async function consultarLoRegistrado(registros) {
	const documentos = await ClienteGateway.listarPorDocumentos(registros.map((r) => r.idClienteLegado ?? ''));
	const [correos, dominios] = await Promise.all([
		UsuarioGateway.listarCorreosRegistrados(registros.map((r) => r.correo ?? '')),
		DominioGateway.listarNombresRegistrados(registros.map((r) => r.dominio ?? '')),
	]);
	const legados = new Set(
		documentos.filter((d) => d.tipoDocumento === TIPO_DOCUMENTO_LEGADO).map((d) => d.numeroDocumento),
	);
	return { documentos: new Set(documentos.map((d) => d.numeroDocumento)), legados, correos: new Set(correos), dominios: new Set(dominios) };
}

function cotejarContra(registrado) {
	return (registro, vistos) => ({
		idYaMigrado: registrado.legados.has(registro.idClienteLegado) || vistos.ids.has(registro.idClienteLegado),
		documentoOcupado: registrado.documentos.has(registro.idClienteLegado),
		correoOcupado: registrado.correos.has(registro.correo) || vistos.correos.has(registro.correo),
		dominioOcupado: registrado.dominios.has(registro.dominio) || vistos.dominios.has(registro.dominio),
	});
}

async function prepararCliente(registro, fecha) {
	const { últimosDígitos, ...tarjeta } = registro.tarjetaParaGuardar();
	const [contraseña, respuestaSeguridad] = await Promise.all([
		generarHash(randomBytes(32).toString('hex')),
		generarHash(`${registro.idClienteLegado}${últimosDígitos}`),
	]);
	return {
		cuenta: { correo: registro.correo, contraseña, preguntaSeguridad: PREGUNTA_DE_RECLAMO, respuestaSeguridad, estado: registro.estado },
		cliente: {
			nombreCompleto: registro.nombre,
			tipoDocumento: TIPO_DOCUMENTO_LEGADO,
			numeroDocumento: registro.idClienteLegado,
			paqueteHosting: registro.paquete,
			planDePago: registro.planDePago,
		},
		tarjeta,
		dominio: registro.dominio,
		conflicto: { registroOriginal: registro.texto, motivo: registro.describirMotivo(MOTIVO_DE_CONFLICTO), fecha },
	};
}

function filaDeEntrada(entrada) {
	return { registroOriginal: entrada.registroOriginal, motivo: entrada.motivo, fecha: entrada.fecha };
}

async function prepararBloque(proceso, registros, fecha) {
	const registrado = await consultarLoRegistrado(registros);
	const { válidos, duplicados, entradas } = proceso.clasificarBloque(registros, cotejarContra(registrado), fecha);
	const clientes = await Promise.all(válidos.map((registro) => prepararCliente(registro, fecha)));
	const punto = proceso.guardarPunto(fecha);
	return {
		duplicados,
		datos: {
			procesoId: proceso.id,
			clientes,
			entradas: entradas.map(filaDeEntrada),
			punto: { posición: punto.posición, fecha: punto.fecha },
		},
	};
}

async function resumir(proceso, cuenta) {
	const { retenidas, ...totales } = cuenta;
	const entradas = await EntradaDeInconsistenciaGateway.listarPorProceso(proceso.id);
	return {
		id: proceso.id,
		estado: proceso.estado,
		posición: proceso.posiciónActual,
		...totales,
		inconsistencias: entradas.length + retenidas.length,
		...(retenidas.length > 0 && { reporteIncompleto: true, entradasRetenidas: retenidas }),
	};
}

/** UC26 pasos 3 a 6. El avance sale de la base: un bloque confirmado no se vuelve a procesar. */
async function procesar(proceso) {
	const cuenta = { migrados: 0, duplicados: 0, retenidas: [] };
	const fecha = hoy();
	enCurso.add(proceso.id);
	let pendienteDeRespaldo = null;
	try {
		for (;;) {
			const registros = proceso.siguienteBloque(TAMAÑO_DE_BLOQUE);
			if (registros.length === 0) break;
			const { datos, duplicados } = await prepararBloque(proceso, registros, fecha);
			pendienteDeRespaldo = datos;
			const { migrados, retenidas } = await guardarBloque(datos);
			pendienteDeRespaldo = null;
			cuenta.migrados += migrados;
			cuenta.duplicados += duplicados;
			cuenta.retenidas.push(...retenidas);
			const fila = await ProcesoDeMigracionGateway.buscarPorId(proceso.id);
			if (fila.estado === EstadoMigración.Pausado) {
				proceso.pausarYGuardarPunto(fecha);
				return await resumir(proceso, cuenta);
			}
		}
		proceso.completar();
		await ProcesoDeMigracionGateway.actualizarEstado(proceso.id, proceso.estado);
		return await resumir(proceso, cuenta);
	} catch (error) {
		if (!esCaidaDeBase(error)) throw error;
		// UC26 E3: con la base caída, el estado Pausado lo escribe el aplicador al reconciliar.
		if (pendienteDeRespaldo) await respaldarEnArchivo(pendienteDeRespaldo, OrigenRespaldo.Migración);
		return { id: proceso.id, pendienteDeReconciliacion: true, mensaje: ALERTA_DE_CONTINGENCIA };
	} finally {
		enCurso.delete(proceso.id);
	}
}

export async function iniciarMigracion({ archivo, nombreArchivo, administradorId }) {
	exigirArchivo(archivo);
	const nombre = exigirTexto(nombreArchivo, 'nombreArchivo');
	if (enCurso.size > 0) throw new ErrorDeServicio(409, 'Ya hay una migración en curso');

	const proceso = new ProcesoDeMigración({ fechaEjecución: hoy(), nombreArchivo: nombre, administrador: administradorId });
	proceso.ejecutar(archivo);
	proceso.id = await ProcesoDeMigracionGateway.insertar({
		fechaEjecución: proceso.fechaEjecución,
		nombreArchivo: nombre,
		administradorId,
		estado: proceso.estado,
	});
	if (proceso.estado === EstadoMigración.RevertidoPorErrorEstructural) {
		throw new ErrorDeServicio(422, 'Falla estructural: el archivo está corrupto o su esquema es incompatible', 'archivo', {
			id: proceso.id,
			estado: proceso.estado,
		});
	}
	return procesar(proceso);
}

async function cargarFila(id) {
	const fila = await ProcesoDeMigracionGateway.buscarPorId(id);
	if (!fila) throw new ErrorDeServicio(404, 'La migración no existe');
	return fila;
}

export async function pausarMigracion(id) {
	await cargarFila(id);
	if (!(await ProcesoDeMigracionGateway.pausarSiSigueEnProgreso(id))) {
		throw new ErrorDeServicio(409, 'Solo se puede pausar una migración en curso');
	}
	const fila = await cargarFila(id);
	return { id, estado: fila.estado, posición: fila.ultimoPuntoControlPosicion ?? 0 };
}

/** UC26 E2: cada fila ya procesada debe seguir migrada o seguir igual en el reporte. */
async function coincideConElAvance(proceso, punto, procesados) {
	if (procesados.length < (punto?.posición ?? 0)) return false;
	if (procesados.length === 0) return true;
	const entradas = await EntradaDeInconsistenciaGateway.listarPorProceso(proceso.id);
	const reportadas = new Set(entradas.map((entrada) => entrada.registroOriginal));
	const { legados } = await consultarLoRegistrado(procesados);
	return procesados.every((registro) => reportadas.has(registro.texto) || legados.has(registro.idClienteLegado));
}

export async function reanudarMigracion(id, archivo) {
	exigirArchivo(archivo);
	const fila = await cargarFila(id);
	const reanudable = fila.estado === EstadoMigración.Pausado || (fila.estado === EstadoMigración.EnProgreso && !enCurso.has(id));
	if (!reanudable) throw new ErrorDeServicio(409, 'Solo se puede reanudar una migración pausada o interrumpida');

	const registros = RegistroLegado.leerArchivo(archivo);
	const punto = fila.ultimoPuntoControlPosicion === null ? null : new PuntoDeControlMigración({ posición: fila.ultimoPuntoControlPosicion, fecha: fila.ultimoPuntoControlFecha });
	const proceso = new ProcesoDeMigración({ ...fila, registros: registros ?? [], puntoDeControl: punto });
	proceso.reanudarDesde(punto);
	const procesados = punto ? proceso.registrosProcesados(punto) : [];
	if (registros === null || !(await coincideConElAvance(proceso, punto, procesados))) {
		throw new ErrorDeServicio(409, 'El archivo cambió frente al punto de avance: reinicie la migración desde cero', 'archivo');
	}
	await ProcesoDeMigracionGateway.actualizarEstado(id, proceso.estado);
	return procesar(proceso);
}

/** UC28: encabezado de la sesión y sus entradas. */
export async function obtenerReporte(id) {
	const encabezado = await ProcesoDeMigracionGateway.buscarReporte(id);
	if (!encabezado) throw new ErrorDeServicio(404, 'La migración no existe');
	return { ...encabezado, entradas: await EntradaDeInconsistenciaGateway.listarPorProceso(id) };
}

/** RT4: si ya se reanudó, el bloque volvió a procesarse y el respaldo no aporta nada. */
export const aplicadoresDeRespaldoDeMigracion = Object.freeze({
	async [OrigenRespaldo.Migración](datos) {
		const fila = await ProcesoDeMigracionGateway.buscarPorId(datos.procesoId);
		if ((fila.ultimoPuntoControlPosicion ?? 0) < datos.punto.posición) await guardarBloque(datos);
		await ProcesoDeMigracionGateway.pausarSiSigueEnProgreso(datos.procesoId);
	},
});
