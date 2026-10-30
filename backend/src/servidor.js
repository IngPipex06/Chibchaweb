import { app } from './app.js';
import { entorno } from './config/entorno.js';
import { AlgoritmoDeCifradoBlowfish } from './dominio/respaldo/AlgoritmoDeCifradoBlowfish.js';

// El respaldo actúa cuando la base cae: si Blowfish no está disponible, debe saberse al arrancar.
new AlgoritmoDeCifradoBlowfish().cifrar('verificación');

app.listen(entorno.puerto, () => {
	console.log(`API de ChibchaWeb en el puerto ${entorno.puerto}`);
});
