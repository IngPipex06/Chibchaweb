import { pool } from '../src/config/baseDeDatos.js';
import { aplicadoresDeRespaldo } from '../src/servicios/perfiles/ServicioDePerfiles.js';
import { reconciliar } from '../src/servicios/respaldo/ServicioDeContingencia.js';

const { aplicados, pendientes } = await reconciliar(aplicadoresDeRespaldo);
console.log(`Reconciliados: ${aplicados}. Pendientes: ${pendientes}.`);
await pool.end();
