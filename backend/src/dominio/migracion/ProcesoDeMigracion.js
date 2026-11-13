import { EntradaDeInconsistencia } from './EntradaDeInconsistencia.js';
import { EstadoMigración } from './EstadoMigracion.js';
import { PuntoDeControlMigración } from './PuntoDeControlMigracion.js';
import { RegistroLegado } from './RegistroLegado.js';

export class ProcesoDeMigración {
	#administrador;
	#entradasDeInconsistencia;
	#estado;
	#fechaEjecución;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#nombreArchivo;
	#posiciónActual;
	#puntoDeControl;
	/**
	 * Las filas del archivo. Solo en memoria: al reanudar, el Administrador vuelve a cargarlo.
	 */
	#registros;
	/**
	 * UC26 A2: lo aceptado en esta corrida, para detectar repetidos dentro del archivo.
	 */
	#vistos = { ids: new Set(), correos: new Set(), dominios: new Set() };

	constructor(datos = {}) {
		this.#administrador = datos.administrador ?? null;
		this.#entradasDeInconsistencia = datos.entradasDeInconsistencia ?? [];
		this.#estado = datos.estado ?? EstadoMigración.EnProgreso;
		this.#fechaEjecución = datos.fechaEjecución ?? null;
		this.#id = datos.id ?? null;
		this.#nombreArchivo = datos.nombreArchivo ?? null;
		this.#posiciónActual = datos.posiciónActual ?? 0;
		this.#puntoDeControl = datos.puntoDeControl ?? null;
		this.#registros = datos.registros ?? [];
	}

	get estado() {
		return this.#estado;
	}

	get fechaEjecución() {
		return this.#fechaEjecución;
	}

	get id() {
		return this.#id;
	}

	set id(valor) {
		this.#id = valor;
	}

	get posiciónActual() {
		return this.#posiciónActual;
	}

	get puntoDeControl() {
		return this.#puntoDeControl;
	}

	/**
	 * UC26 E2: lo que ya se procesó según el punto de avance.
	 * @returns {RegistroLegado[]}
	 */
	registrosProcesados(punto) {
		return this.#registros.slice(0, punto.posición);
	}

	/**
	 * UC26 pasos 1 y 2. Una falla estructural termina aquí, antes de insertar nada.
	 * @param {Buffer} archivoOrigen
	 */
	ejecutar(archivoOrigen) {
		const registros = RegistroLegado.leerArchivo(archivoOrigen);
		if (registros === null) {
			this.revertir();
			return;
		}
		this.#registros = registros;
		this.#posiciónActual = 0;
	}

	/**
	 * @returns {RegistroLegado[]} las filas pendientes, sin avanzar
	 */
	siguienteBloque(tamaño) {
		return this.#registros.slice(this.#posiciónActual, this.#posiciónActual + tamaño);
	}

	/**
	 * UC27 sobre un bloque ya cotejado, y UC28 con las filas inválidas. Avanza la posición.
	 * @param {RegistroLegado[]} registros
	 * @param {(registro: RegistroLegado, vistos: object) => object} cotejar lo que sabe la base de cada registro
	 * @returns {{ válidos: RegistroLegado[], duplicados: number, entradas: EntradaDeInconsistencia[] }}
	 */
	clasificarBloque(registros, cotejar, fecha) {
		const clasificado = { válidos: [], duplicados: 0, entradas: [] };
		for (const registro of registros) {
			registro.cotejar(cotejar(registro, this.#vistos));
			if (registro.validar()) {
				this.#recordar(registro);
				clasificado.válidos.push(registro);
			} else if (registro.esDuplicado) {
				clasificado.duplicados += 1;
			} else {
				clasificado.entradas.push(this.crearEntrada(registro, registro.motivos.join('; '), fecha));
			}
		}
		this.#posiciónActual += registros.length;
		return clasificado;
	}

	/**
	 * UC28 paso 3 y A1: todas las reglas en una sola entrada.
	 * @returns {EntradaDeInconsistencia}
	 */
	crearEntrada(registro, motivo, fecha) {
		const entrada = new EntradaDeInconsistencia({
			fecha,
			motivo: registro.describirMotivo(motivo),
			registroOriginal: registro.texto,
		});
		this.agregarEntradaDeInconsistencia(entrada);
		return entrada;
	}

	#recordar(registro) {
		this.#vistos.ids.add(registro.idClienteLegado);
		this.#vistos.correos.add(registro.correo);
		this.#vistos.dominios.add(registro.dominio);
	}

	/**
	 * UC26 paso 5: el punto se guarda tras cada bloque, no solo al pausar.
	 * @returns {PuntoDeControlMigración}
	 */
	guardarPunto(fecha) {
		this.#puntoDeControl = new PuntoDeControlMigración({ posición: this.#posiciónActual, fecha });
		return this.#puntoDeControl;
	}

	/**
	 * @returns {PuntoDeControlMigración}
	 */
	pausarYGuardarPunto(fecha) {
		if (this.#estado !== EstadoMigración.EnProgreso) throw new Error('Solo se pausa una migración en curso');
		this.#estado = EstadoMigración.Pausado;
		return this.guardarPunto(fecha);
	}

	/**
	 * @param {PuntoDeControlMigración} punto
	 */
	reanudarDesde(punto) {
		this.#posiciónActual = punto?.posición ?? 0;
		this.#estado = EstadoMigración.EnProgreso;
	}

	completar() {
		this.#estado = EstadoMigración.Completado;
	}

	revertir() {
		this.#estado = EstadoMigración.RevertidoPorErrorEstructural;
	}

	/**
	 * @param {EntradaDeInconsistencia} entrada
	 */
	agregarEntradaDeInconsistencia(entrada) {
		this.#entradasDeInconsistencia.push(entrada);
	}

	/**
	 * @param {EntradaDeInconsistencia} entrada
	 */
	quitarEntradaDeInconsistencia(entrada) {
		this.#entradasDeInconsistencia = this.#entradasDeInconsistencia.filter((elemento) => elemento !== entrada);
	}
}
