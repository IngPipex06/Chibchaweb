import { app } from './app.js';
import { entorno } from './config/entorno.js';
import { AlgoritmoDeCifradoBlowfish } from './dominio/respaldo/AlgoritmoDeCifradoBlowfish.js';
import { cargarAlgoritmoVigente } from './servicios/respaldo/ServicioDeContingencia.js';
import { escalarTicketsVencidos } from './servicios/soporte/ServicioDeTickets.js';

const PERIODO_DEL_TEMPORIZADOR = 60 * 1000;

// El respaldo actúa cuando la base cae: si Blowfish no está disponible, debe saberse al arrancar.
new AlgoritmoDeCifradoBlowfish().cifrar('verificación');
await cargarAlgoritmoVigente();

app.listen(entorno.puerto, () => {
	console.log(`API de ChibchaWeb en el puerto ${entorno.puerto}`);
});

// UC25 y RT4: el temporizador no es del dominio; desde fuera revisa los tickets y el algoritmo de respaldo cada minuto.
setInterval(() => {
	escalarTicketsVencidos().catch((error) => console.error('No se pudieron escalar los tickets vencidos', error));
	cargarAlgoritmoVigente().catch((error) => console.error('No se pudo releer el algoritmo de respaldo', error));
}, PERIODO_DEL_TEMPORIZADOR);
