/**
 * Simula la franquicia de la tarjeta (VISA, MASTERCARD, DINERS): autoriza la
 * tarjeta (RF1, UC8) y ejecuta el cobro (RF4, UC16) sin integración real. Vive en
 * memoria; no se persiste.
 */
export class PasarelaDePagoSimulada {
	/**
	 * @param {MedioDePago} medio
	 * @returns {boolean}
	 */
	autorizar(medio) {
		return true;
	}

	/**
	 * @param {MedioDePago} medio
	 * @param {number} monto
	 * @returns {boolean}
	 */
	cobrar(medio, monto) {
	}
}
