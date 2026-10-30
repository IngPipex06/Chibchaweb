/**
 * Tarifas de UC11. La especificación no fija precios: son valores de ejemplo, en pesos.
 * `servicios` queda en 0 porque ningún caso de uso define servicios cobrables.
 */
export const TARIFAS = Object.freeze({
	paqueteMensual: Object.freeze({
		'Chibcha-Plata': 20000,
		'Chibcha-Oro': 35000,
		'Chibcha-Platino': 50000,
	}),
	dominio: 15000,
	servicios: 0,
});

export const MESES_POR_PLAN = Object.freeze({
	Mensual: 1,
	Trimestral: 3,
	Semestral: 6,
	Anual: 12,
});
