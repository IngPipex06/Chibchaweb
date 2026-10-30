import { EstadoMigración } from './EstadoMigracion.js';

export class ProcesoDeMigración {
	#entradasDeInconsistencia;
	#estado;
	#fechaEjecución;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#posiciónActual;
	#puntoDeControl;

	constructor(datos = {}) {
		this.#entradasDeInconsistencia = datos.entradasDeInconsistencia ?? [];
		this.#estado = datos.estado ?? EstadoMigración.EnProgreso;
		this.#fechaEjecución = datos.fechaEjecución ?? null;
		this.#id = datos.id ?? null;
		this.#posiciónActual = datos.posiciónActual ?? null;
		this.#puntoDeControl = datos.puntoDeControl ?? null;
	}

	/**
	 * @param {Archivo} archivoOrigen
	 */
	ejecutar(archivoOrigen) {
	}

	/**
	 * @returns {PuntoDeControlMigración}
	 */
	pausarYGuardarPunto() {
	}

	/**
	 * @param {PuntoDeControlMigración} punto
	 */
	reanudarDesde(punto) {
	}

	revertir() {
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
