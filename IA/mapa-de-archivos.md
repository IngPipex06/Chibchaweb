# Mapa de archivos de ChibchaWeb

Estructura del repositorio. Las carpetas ya están creadas. De los archivos que se listan aquí existen los 54 de `backend/src/dominio/`, exportados desde Enterprise Architect, los de `database/` y, en `backend/`, lo que usan UC1 a UC15 (ver "Backend construido"). El resto de gateways, rutas y servicios se crea con su funcionalidad. La plantilla de Vite sigue en la raíz hasta que se mueva a `frontend/`.

## Tres niveles

| Nivel | Carpeta | Tecnología | Contiene |
|---|---|---|---|
| Presentación | `frontend/` | React con Vite | Pantallas por rol; solo habla con la API |
| Lógica | `backend/` | Node.js (JavaScript) | API, capa de servicios, dominio y *gateways* |
| Datos | `database/` | PostgreSQL | Esquema, tipos `ENUM` y datos iniciales |

## Árbol general

```text
code/
├── README.md
├── package.json                 scripts de todo el repositorio (workspaces)
├── docker-compose.yml           PostgreSQL en contenedor
├── .env.example                 credenciales y puerto de la base de datos
├── .gitignore
├── IA/                          contexto y este mapa
├── frontend/                    nivel de presentación
├── backend/                     nivel de lógica
└── database/                    nivel de datos
```

## frontend/

La plantilla actual se mueve aquí y se pasa de TypeScript a JavaScript. El detalle de las pantallas se define con el trabajo de UX/UI.

```text
frontend/
├── package.json, package-lock.json
├── index.html
├── vite.config.js
├── eslint.config.js
├── public/                      logos e íconos actuales
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── assets/
    ├── rutas/                   rutas y protección por rol
    ├── api/                     llamadas HTTP al backend
    ├── componentes/             piezas reutilizables
    └── paginas/
        ├── publico/             portal, inicio de sesión, registro
        ├── cliente/
        ├── distribuidor/
        ├── administrador/
        └── tecnico/
```

## backend/

```text
backend/
├── package.json
├── .env.example                 conexión a la base de datos y puerto
├── respaldos/                   archivos cifrados de contingencia (no se versiona)
├── test/                        misma organización que src/
└── src/
    ├── servidor.js              arranque
    ├── app.js                   configuración de la API
    ├── config/
    │   ├── entorno.js
    │   └── baseDeDatos.js       conexión a PostgreSQL
    ├── api/                     entrada HTTP
    │   ├── middleware/
    │   │   ├── autenticacion.js
    │   │   ├── autorizacion.js  permisos por rol
    │   │   └── errores.js
    │   └── rutas/
    │       ├── usuarios.rutas.js
    │       ├── perfiles.rutas.js
    │       ├── facturacion.rutas.js
    │       ├── pagos.rutas.js
    │       ├── solicitudes.rutas.js
    │       ├── soporte.rutas.js
    │       └── migracion.rutas.js
    ├── servicios/               capa de servicios
    ├── dominio/                 54 archivos, uno por clase del modelo
    └── datos/
        └── gateways/            20 archivos, uno por tabla
```

### backend/src/servicios/

La capa de servicios no está modelada. Estos nombres son una propuesta, uno o dos por región.

```text
servicios/
├── usuarios/       ServicioDeAutenticacion.js, ServicioDeUsuarios.js, ServicioDeRoles.js
├── perfiles/       ServicioDePerfiles.js, ServicioDeMediosDePago.js
├── facturacion/    ServicioDeFacturacion.js, ServicioDeCierreMensual.js
├── pagos/          ServicioDePagos.js
├── solicitudes/    ServicioDeSolicitudes.js
├── soporte/        ServicioDeTickets.js, FabricaDeEstadoTicket.js
├── migracion/      ServicioDeMigracion.js
└── respaldo/       ServicioDeRespaldo.js, FabricaDeAlgoritmoDeCifrado.js
```

Las dos fábricas son las fábricas simples que describe la Sección 5 del documento: traducen `ticket.estado` y `configuracion_cifrado.algoritmoActivo` a sus objetos.

### backend/src/dominio/

Las carpetas son las 8 regiones del diagrama 60, con las mismas clases. El esqueleto salió de la exportación de Enterprise Architect y se convirtió a clases ES con los datos del modelo (herencia, realizaciones, visibilidad y tipos). No se debe volver a exportar sobre estos archivos: un cambio en el modelo se pasa al código a mano.

```text
dominio/
├── usuarios/
│   ├── Usuario.js                 abstracta
│   ├── Titular.js                 abstracta
│   ├── Cliente.js
│   ├── Distribuidor.js
│   ├── Empleado.js                abstracta
│   ├── Administrador.js
│   ├── TecnicoDeSoporte.js
│   ├── Rol.js
│   ├── Permiso.js
│   ├── PreguntaDeSeguridad.js
│   ├── EstadoUsuario.js           enumeración
│   └── CategoriaDistribuidor.js   enumeración
├── perfiles/
│   ├── Direccion.js
│   ├── MedioDePago.js             abstracta, Template Method
│   ├── TarjetaVisa.js
│   ├── TarjetaMastercard.js
│   ├── TarjetaDiners.js
│   ├── PaqueteDeHosting.js        enumeración
│   └── PlanDePago.js              enumeración
├── facturacion/
│   ├── Factura.js
│   ├── CierreMensual.js
│   ├── Comision.js
│   ├── Cheque.js
│   ├── BancoSimulado.js
│   └── EstadoFactura.js           enumeración
├── pagos/
│   ├── ComprobanteDePago.js
│   ├── PasarelaDePagoSimulada.js
│   └── EstadoComprobante.js       enumeración
├── solicitudes/
│   ├── SolicitudDeDominio.js
│   ├── Dominio.js
│   ├── ArchivoXML.js
│   ├── RegistradorSimulado.js
│   └── EstadoSolicitudDominio.js  enumeración
├── soporte/
│   ├── Ticket.js                  contexto de State
│   ├── EstadoTicket.js            interfaz
│   ├── TicketAbierto.js
│   ├── TicketEnProgreso.js
│   ├── TicketRezagado.js
│   ├── TicketResuelto.js
│   ├── NivelDeServicio.js         enumeración
│   └── Prioridad.js               enumeración
├── migracion/
│   ├── ProcesoDeMigracion.js      originador de Memento
│   ├── RegistroLegado.js
│   ├── EntradaDeInconsistencia.js
│   ├── PuntoDeControlMigracion.js Memento
│   └── EstadoMigracion.js         enumeración
└── respaldo/
    ├── GestorDeRespaldoCifrado.js contexto de Strategy
    ├── ArchivoDeRespaldoCifrado.js
    ├── AlgoritmoDeCifrado.js      interfaz
    ├── AlgoritmoDeCifradoAES256.js
    ├── AlgoritmoDeCifradoChaCha20.js
    ├── AlgoritmoDeCifradoBlowfish.js
    ├── AlgoritmoDeCifradoTripleDES.js
    └── OrigenRespaldo.js          enumeración
```

### backend/src/datos/gateways/

Un *Table Data Gateway* por tabla, como decide la Sección 5.1 del documento.

```text
gateways/
├── UsuarioGateway.js
├── ClienteGateway.js
├── DistribuidorGateway.js
├── EmpleadoGateway.js
├── AdministradorGateway.js
├── TecnicoDeSoporteGateway.js
├── RolGateway.js
├── PermisoGateway.js
├── MedioDePagoGateway.js
├── FacturaGateway.js
├── CierreMensualGateway.js
├── ComisionGateway.js
├── ChequeGateway.js
├── ComprobanteDePagoGateway.js
├── SolicitudDeDominioGateway.js
├── DominioGateway.js
├── TicketGateway.js
├── ProcesoDeMigracionGateway.js
├── EntradaDeInconsistenciaGateway.js
└── ConfiguracionCifradoGateway.js
```

## database/

```text
database/
├── iniciar.sh                   aplica migraciones y semillas al crear el volumen
├── migraciones/                 en orden, por las claves foráneas
│   ├── 001_tipos_enum.sql
│   ├── 002_usuarios.sql         usuario, cliente, distribuidor, empleado, rol, permiso,
│   │                            administrador, tecnico_de_soporte
│   ├── 003_perfiles.sql         medio_de_pago
│   ├── 004_facturacion.sql      factura, cierre_mensual, comision, cheque
│   ├── 005_pagos.sql            comprobante_de_pago
│   ├── 006_solicitudes.sql      dominio, solicitud_de_dominio
│   ├── 007_soporte.sql          ticket
│   ├── 008_migracion.sql        proceso_de_migracion, entrada_de_inconsistencia
│   └── 009_respaldo.sql         configuracion_cifrado
└── semillas/
    └── 001_datos_iniciales.sql  roles, permisos y la fila de configuracion_cifrado
```

La base corre en Docker, sin instalar PostgreSQL: `cp .env.example .env` y `docker compose up -d`. La primera vez, `iniciar.sh` aplica las migraciones en orden numérico y luego las semillas. Esos scripts solo corren con el volumen vacío, así que un cambio en ellos se aplica con `docker compose down -v`, que borra los datos, seguido de `docker compose up -d`.

Las migraciones salen del diagrama entidad-relación. Las columnas conservan el nombre exacto del modelo, así que en SQL se escriben entre comillas (`"fechaCreación"`). Cada `ENUM` del modelo es un `CREATE TYPE` con nombre propio.

## Reglas de dependencia

1. `frontend/` solo conoce la API; nunca el dominio ni la base de datos.
2. `api/` llama a `servicios/`; no contiene reglas de negocio.
3. `servicios/` coordina: pide filas a `datos/`, arma los objetos de `dominio/` y guarda el resultado.
4. `dominio/` no importa nada de `api/`, `servicios/` ni `datos/`, y no contiene SQL.
5. `datos/gateways/` solo mueve filas; no conoce las clases de dominio.

## Convenciones

- Carpetas y archivos sin tildes, para evitar problemas entre sistemas operativos y en Git. Si la exportación de EA genera `Dirección.js`, se renombra a `Direccion.js`.
- Dentro del código, las clases y los atributos conservan el nombre exacto del modelo, con tildes (`class Dirección`). Node lo admite; se comprobó con clases, campos privados e imports.
- Las enumeraciones son objetos congelados con `Object.freeze`, porque JavaScript no tiene `enum`. Excepción: `NivelDeServicio` tiene el método `siguiente()`, así que es una clase con instancias estáticas congeladas y su texto está en `.valor`.
- Las claves de `PaqueteDeHosting` no llevan guion (`ChibchaPlatino`), pero sus valores conservan el nombre del modelo (`'Chibcha-Platino'`).
- Las interfaces `EstadoTicket` y `AlgoritmoDeCifrado` son clases base cuyos métodos lanzan un error si no se implementan. Los métodos abstractos hacen lo mismo.
- Las clases abstractas lanzan un error si se instancian directamente.
- Los atributos son privados (`#id`) y se reciben en el constructor con un objeto: `new Ticket({ id: 1 })`. Los métodos privados también usan `#`; los protegidos se marcan con `@protected`, porque JavaScript no los tiene.

## Backend construido

- API con Express 5 y PostgreSQL con `pg`. Contraseñas y respuestas de seguridad con bcrypt (costo 12, máximo 72 bytes). Sesión con JWT en la cabecera `Authorization: Bearer`.
- Rutas en `/api/usuarios`: `POST /registro` (UC1), `POST /sesion` (UC2), `POST /recuperacion/pregunta` y `POST /recuperacion` (UC3 y UC4), `GET /perfil`.
- Rutas en `/api/perfiles` (UC5 a UC10): `GET /gestiones`; y en `/clientes`, `/personal` y `/distribuidores`: `GET /` (con `?buscar=`), `GET /:id`, `POST /`, `PUT /:id` y `POST /:id/inhabilitar`. Solo clientes tiene `POST /:id/reactivar`. Cada grupo exige su permiso con `exigirPermiso` (`api/middleware/autorizacion.js`).
- Gateways: usuario, cliente, distribuidor, empleado, administrador, técnico de soporte, rol, permiso y medio de pago, cada uno con las consultas que ya se usan.
- Uso: `cp backend/.env.example backend/.env`, igualar la clave de `DATABASE_URL` con la del `.env` de la raíz, y `npm install` y `npm start` dentro de `backend/`. `npm test` necesita la base levantada.
- Primer administrador: `ADMIN_CORREO=... ADMIN_CONTRASENA=... ADMIN_NOMBRE=... ADMIN_DOCUMENTO=... ADMIN_ROL="Administrador de Personal" npm run crear-admin`. UC9 no sirve para esto porque ya exige un administrador.
- Cifrado de respaldos con `crypto` de Node para los cuatro algoritmos, sin dependencias: `aes-256-gcm`, `chacha20-poly1305`, `bf-cbc` y `des-ede3-cbc`. Blowfish vive en el proveedor legacy de OpenSSL 3, por eso los scripts de `backend/package.json` usan `--openssl-legacy-provider`; sin esa opción el servidor no arranca. Blowfish y Triple DES no detectan alteraciones del archivo. La clave maestra es `CLAVE_RESPALDO`: si se pierde, los respaldos no se pueden descifrar.
- `config/hash.js`, `config/cifrado.js` y `servicios/usuarios/validacion.js` son apoyo de código y no están en el modelo. En el dominio, `iniciarSesión` y `validarRespuesta` devuelven una promesa de booleano, porque bcrypt es asíncrono.

- Contingencia RT4 (UC6, UC9 y UC10, crear y editar): `persistir` en `ServicioDePerfiles` detecta la caída con `config/baseDeDatos.js` y `servicios/respaldo/ServicioDeContingencia.js` cifra los datos con `GestorDeRespaldoCifrado` y los agrega a `RUTA_RESPALDO`, con el algoritmo de `configuracion_cifrado`, que se carga en memoria al arrancar porque la tabla no se puede leer durante la caída; cambiarlo exige reiniciar, y si la base no responde al arrancar se usa AES256. La API responde 202. Lo pendiente es lo que siga en el archivo, no un estado. `npm run reconciliar` lo aplica con `aplicadoresDeRespaldo` cuando la base vuelve y conserva lo que no se pueda aplicar. Una edición respaldada sobrescribe lo que se haya cambiado después en ese perfil.
- UC2 E2: `ServicioDeAutenticacion` responde `ofrecerRecuperacion: true` en cada fallo, como el diagrama, y cuenta en memoria los fallos por correo para marcar `limiteDeIntentosAlcanzado` al quinto, como el caso de uso extendido. No bloquea la cuenta y se pierde al reiniciar.
- UC9: nadie cambia su propio rol ni inhabilita su propia cuenta. Son reglas adicionales a los casos de uso.
- UC8: una franquicia no aceptada se rechaza sin listar otros errores, como en el diagrama. UC6 verifica el documento antes de UC7 y UC8; UC9 y UC10 dependen de la restricción UNIQUE.
- Tarjetas: la vigencia solo se valida al ingresarlas, y no hay estados de tarjeta. El front muestra `Inhabilitado` como "Inactivo".
- `MedioDePago` recibe el número completo en el constructor, lo guarda solo en memoria y deriva `numeroEnmascarado`, porque `validar()` no tiene parámetros y Luhn, longitud y prefijo necesitan el número. También expone `motivosDeRechazo` para la lista de errores de UC8; `Dirección` expone `erroresDeFormato` para UC7. A la base solo llega el número enmascarado, por eso editar un cliente exige reingresar la tarjeta (UC6 paso 8); si es la misma, no se duplica la fila.
- `PasarelaDePagoSimulada.autorizar` siempre aprueba. Las altas por administrador de UC6 y UC10 piden `correo` y `contraseña`, que los casos de uso no nombran y `usuario` exige. Comisión inicial de distribuidor: 10 para Básico y 15 para Premium.

- UC11: `POST /api/facturacion/facturas` con `titularId` y `período` (`AAAA-MM`), permiso `GenerarFactura`. El número `FAC-000123` sale de la secuencia `factura_numero_seq`. `Factura.emitir()` fija estado, emisión y vencimiento a 30 días.
- `config/tarifas.js` no está en el modelo: precios de ejemplo, porque la especificación no los fija, y servicios en 0. Cliente: paquete por meses del plan más dominios. Distribuidor: dominios gestionados de un mes. Un dominio de cliente gestionado por un distribuidor se cobra a ambos, porque ningún caso de uso lo excluye. El desglose `cargos` solo va en la respuesta.
- UC11 se dispara solo por el Administrador, como `UC-corregido.md` y la imagen; la especificación menciona además disparo automático. No hay regla contra dos facturas del mismo titular y periodo.
- Cierre (ajuste aprobado): `cierre_mensual.fechaEjecución` es nullable y se llena al completar; `período` es UNIQUE y `comision` tiene UNIQUE (`distribuidorId`, `período`). En EA el UNIQUE compuesto consta en las notas de ambas columnas.
- El diagrama de actividades 37 del `.qea` no refleja UC11: contiene elementos de UC12. La fuente válida es `actividad-uc11.png`.
- UC12: `POST /api/facturacion/cierres` con `período` (`AAAA-MM`), permiso `EjecutarCierreMensual`. Periodo válido: formato, mes terminado (actividad) y no cerrado antes (extendido, 409). La fila de `cierre_mensual` se crea antes del bucle y `fechaEjecución` se llena al final; `ServicioDeCierreMensual` arma un `CierreMensual` por distribuidor pendiente y guarda cada uno en su transacción, así A2 retoma los activos sin comisión de ese mes. El resumen cuenta solo lo procesado en esa corrida.
- UC13: dominios por COUNT sobre `dominio.distribuidorId` al cierre, sin fecha, porque `dominio` no la tiene. El aviso no tiene tabla: `avisoDeCategoría` vive en memoria y sale en el resumen.
- UC14: monto facturado es la suma de facturas del distribuidor con `fechaEmisión` en el mes, en cualquier estado, redondeado al centavo. RF6 dice "por ciclo" y UC12 dice independiente del ciclo. A1: cheque en cero.
- UC15: `BancoSimulado.emitirCheque` devuelve `CHQ-XXXXXXXX`. `GET /api/facturacion/cheques/:id/pdf`, con `pdfkit`, devuelve el PDF; `exportarPDF()` es asíncrono porque `pdfkit` genera por flujo.
- En memoria y fuera del modelo: `Distribuidor.avisoDeCategoría`, `Comisión.montoFacturado`, `CierreMensual.pendientes`, `Cheque.comisión`. `COMISIÓN_POR_CATEGORÍA` pasó de `ServicioDePerfiles` a `Distribuidor.js`.
- `npm test` usa `--test-concurrency=1`: el cierre toma a todos los distribuidores activos y chocaría con otras pruebas que crean y borran distribuidores. Las pruebas del cierre usan meses de 2020 y sí pueden recalcular la categoría de distribuidores reales si se corren contra una base con datos: usar base desechable.
