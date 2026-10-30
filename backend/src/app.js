import express from 'express';
import { manejarErrores } from './api/middleware/errores.js';
import { rutasDePerfiles } from './api/rutas/perfiles.rutas.js';
import { rutasDeUsuarios } from './api/rutas/usuarios.rutas.js';

export const app = express();

app.use(express.json());
app.use('/api/usuarios', rutasDeUsuarios);
app.use('/api/perfiles', rutasDePerfiles);
app.use(manejarErrores);
