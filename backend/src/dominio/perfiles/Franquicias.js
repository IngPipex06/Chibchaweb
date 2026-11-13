import { TarjetaDiners } from './TarjetaDiners.js';
import { TarjetaMastercard } from './TarjetaMastercard.js';
import { TarjetaVisa } from './TarjetaVisa.js';

// Factory simple de la jerarquía de tarjetas (Sección 5 del documento).
export const FRANQUICIAS = Object.freeze({
	Visa: TarjetaVisa,
	Mastercard: TarjetaMastercard,
	Diners: TarjetaDiners,
});
