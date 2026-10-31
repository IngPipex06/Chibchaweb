# ChibchaWeb

Plataforma de hosting y registro de dominios, desarrollada para la asignatura Fundamentos de Ingeniería de Software de la Universidad Distrital.

Atiende clientes, distribuidores, técnicos de soporte y administradores: registro y perfiles, facturación y cierre mensual, pagos, solicitudes de dominio, tickets de soporte y migración de datos legados.

## Estado

| Parte | Estado |
|---|---|
| Base de datos | Construida |
| Backend | Construido (UC1 a UC26) |
| Frontend | Sin construir |

La carpeta `src/` de la raíz sigue siendo la plantilla de Vite y debe moverse a `frontend/`.

## Tecnologías

- **Backend:** Node.js 22 y Express 5
- **Base de datos:** PostgreSQL 17 en Docker
- **Frontend previsto:** React con Vite

## Estructura

```
code/
├── backend/
│   ├── src/
│   │   ├── api/          rutas y middleware
│   │   ├── servicios/    coordinación de cada caso de uso
│   │   ├── dominio/      clases del modelo y reglas de negocio
│   │   ├── datos/        gateways, lo único que contiene SQL de datos
│   │   └── config/       entorno, conexión, hash y cifrado
│   ├── scripts/          crear administrador y reconciliar respaldos
│   └── test/             pruebas de dominio y de API
├── database/             migraciones, semillas e iniciar.sh
├── frontend/             pendiente
└── IA/                   mapa-de-archivos.md
```

## Arquitectura

Son tres niveles (presentación, lógica y datos), y el backend se divide en capas:

- `api` recibe la petición y llama a `servicios`.
- `servicios` coordina `datos` y `dominio`.
- `dominio` guarda las reglas de negocio y no importa `api`, `servicios` ni `datos`, ni contiene SQL.
- `datos` solo mueve filas entre la base y los servicios.

El detalle por archivo y las decisiones de implementación están en [`IA/mapa-de-archivos.md`](IA/mapa-de-archivos.md).

## Puesta en marcha

Requisitos: Docker con Compose y Node.js 22.

1. Crea los archivos de entorno y cambia las contraseñas y los secretos. El `DATABASE_URL` de `backend/.env` debe coincidir con los datos de `.env`.

   ```sh
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

2. Levanta la base de datos. Las migraciones y las semillas se aplican solo cuando el volumen está vacío.

   ```sh
   docker compose up -d
   ```

3. Instala las dependencias del backend y arráncalo. La API queda en el puerto de `PORT`, 3000 por defecto.

   ```sh
   cd backend
   npm install
   npm run dev
   ```

4. Crea el primer administrador, porque UC9 ya exige uno. El rol debe existir en las semillas.

   ```sh
   ADMIN_CORREO=admin@ejemplo.com \
   ADMIN_CONTRASENA=una-clave-segura \
   ADMIN_NOMBRE="Nombre Apellido" \
   ADMIN_DOCUMENTO=123456 \
   ADMIN_ROL="Administrador de Personal" \
   npm run crear-admin
   ```

## Scripts del backend

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca la API |
| `npm run dev` | Arranca la API y la reinicia al cambiar el código |
| `npm test` | Corre las pruebas; necesita la base de datos encendida |
| `npm run crear-admin` | Crea un administrador con las variables `ADMIN_*` |
| `npm run reconciliar` | Aplica los respaldos pendientes cuando la base vuelve |

## API

| Prefijo | Contenido |
|---|---|
| `/api/usuarios` | Registro, sesión, recuperación y perfil |
| `/api/perfiles` | Gestión de clientes, personal y distribuidores |
| `/api/facturacion` | Facturas, cierre mensual y cheques |
| `/api/pagos` | Medios de pago y pagos |
| `/api/solicitudes` | Solicitudes de dominio |
| `/api/soporte` | Tickets de soporte |
| `/api/migraciones` | Migración de datos legados |

## Contingencia

Si la base de datos cae al guardar, los datos se cifran y se agregan a `RUTA_RESPALDO`, y la API responde 202. Al volver la base, `npm run reconciliar` los aplica y conserva lo que no se pueda aplicar. El algoritmo sale de la tabla `configuracion_cifrado` y un cambio aplica en menos de un minuto, sin reiniciar. Blowfish requiere `--openssl-legacy-provider`, que los scripts ya incluyen.
