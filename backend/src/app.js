import express from 'express';
import { manejarErrores } from './api/middleware/errores.js';
import { rutasDeFacturacion } from './api/rutas/facturacion.rutas.js';
import { rutasDePagos } from './api/rutas/pagos.rutas.js';
import { rutasDePerfiles } from './api/rutas/perfiles.rutas.js';
import { rutasDeUsuarios } from './api/rutas/usuarios.rutas.js';

export const app = express();

app.use(express.json());
app.use('/api/usuarios', rutasDeUsuarios);
app.use('/api/perfiles', rutasDePerfiles);
app.use('/api/facturacion', rutasDeFacturacion);
app.use('/api/pagos', rutasDePagos);
app.use(manejarErrores);
