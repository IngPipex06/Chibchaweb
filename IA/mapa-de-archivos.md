# Mapa de archivos de ChibchaWeb

Estructura del repositorio. Las carpetas ya están creadas. De los archivos que se listan aquí existen los 55 de `backend/src/dominio/`, exportados desde Enterprise Architect, más `perfiles/Franquicias.js`, fuera del modelo, los de `database/` y, en `backend/`, lo que usan UC1 a UC26 (ver "Backend construido"). El resto de gateways, rutas y servicios se crea con su funcionalidad. El frontend está en `frontend/`.

## Tres niveles

| Nivel | Carpeta | Tecnología | Contiene |
|---|---|---|---|
| Presentación | `frontend/` | React, React Router y Vite (JavaScript) | Pantallas por rol; solo habla con la API |
| Lógica | `backend/` | Node.js (JavaScript) | API, capa de servicios, dominio y *gateways* |
| Datos | `database/` | PostgreSQL | Esquema, tipos `ENUM` y datos iniciales |

## Árbol general

```text
code/
├── README.md
├── docker-compose.yml           PostgreSQL en contenedor
├── .env.example                 credenciales y puerto de la base de datos
├── .gitignore
├── IA/                          contexto y este mapa
├── frontend/                    nivel de presentación
├── backend/                     nivel de lógica
└── database/                    nivel de datos
```

## frontend/

React 19, React Router 7 y Vite 8, en JavaScript. Solo conoce la API: todas las llamadas salen de `src/api/` y van a rutas relativas `/api`, que Vite reenvía a `http://localhost:3000` porque el backend no tiene CORS.

```text
frontend/
├── package.json                 se instala por su cuenta, igual que backend/
├── index.html                   carga Plus Jakarta Sans y Space Grotesk
├── vite.config.js               proxy de /api en dev y preview
├── eslint.config.js
├── public/                   favicon.svg y logos tunjoLogo (.svg, .jpg, BB.svg), sin uso aún
└── src/
    ├── main.jsx
    ├── App.jsx                  sesión, encabezado, rutas y pie
    ├── index.css                paleta, tipografía y clases de la interfaz
    ├── assets/
    ├── api/
    │   ├── http.js              token, 401, errores { error, campo, ...extras }, 202 y descargas con blob
    │   ├── servicios.js         una función por endpoint
    │   └── sesion.js            contexto de sesión, inicio por tipo y correo recordado
    ├── rutas/
    │   ├── Rutas.jsx            árbol de rutas por rol
    │   └── Proteccion.jsx       RutaProtegida (tipo y permiso) y SoloSinSesion
    ├── componentes/
    │   ├── Interfaz.jsx         Pagina, Tarjeta, Aviso, Tabla, Ficha, Resumen, Accesos, Etiqueta
    │   ├── Formulario.jsx       campos declarativos, errores por campo y por bloque
    │   ├── Dialogo.jsx          confirmaciones y textos de técnico
    │   ├── Encabezado.jsx       menú según tipo y permisos
    │   ├── ProveedorDeSesion.jsx
    │   ├── ganchos.js           useDatos, useEnvio (doble envío), useFormulario, useBloqueo
    │   ├── validacion.js        formatos iguales a los del backend
    │   ├── avisos.js · formato.js · valores.js · navegacion.js · camposComunes.js
    │   └── titular/             compartido entre Cliente y Distribuidor
    │       ├── InicioTitular.jsx
    │       ├── AreaDePagos.jsx  UC16
    │       ├── MediosDePago.jsx UC17, UC8
    │       ├── Comprobantes.jsx UC18
    │       └── Soporte.jsx      UC22
    └── paginas/
        ├── publico/             Portal (UC0), Registro (UC1), InicioSesion (UC2), RecuperarContrasena (UC3, UC4)
        ├── cliente/             InicioCliente, Solicitudes (UC19 a UC21)
        ├── distribuidor/        InicioDistribuidor
        ├── administrador/       InicioAdministrador (UC5), GestionDePerfiles y configuracionDeGestiones (UC6 a UC10),
        │                        Facturacion (UC11, RF4), CierreMensual (UC12 a UC15), Migracion (UC26 a UC28)
        └── tecnico/             Tablero (UC23 a UC25)
```

### Decisiones del frontend

- Pagos y soporte no se duplican: viven en `componentes/titular/` y `rutas/Rutas.jsx` los monta bajo `/cliente` y `/distribuidor`.
- La protección de rutas solo orienta; la seguridad está en el backend. Un 401 fuera de los formularios de acceso olvida el token y lleva a iniciar sesión.
- El 202 se muestra como "pendiente de reconciliación" y no abre ni cuenta el registro, salvo en migración, donde sí trae `id`.
- Bloqueo de 3 minutos: en inicio de sesión se activa con `limiteDeIntentosAlcanzado`; en registro lo cuenta el front. El fin del bloqueo se guarda en el navegador (hueco 8).
- Los `id` de migración se guardan en el navegador (hueco 2). Pausar solo se ofrece cuando ya se conoce el `id` (hueco 1) y no lo bloquea una reanudación abierta.
- Facturación ofrece solo los titulares que el rol puede listar (hueco 3). Facturas, cierres y cheques avisan que no se consultan después (huecos 4 y 5).
- Los datos de tarjeta solo viven en memoria mientras se escribe el formulario; nunca se guardan en el navegador.
- Paleta: #64C9ED, #EDE564, #ED6484, #98737B, #606A6E, #6E6D60. #EDE564 solo en llamadas de atención críticas. Ningún estado se comunica solo con color.

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
│   ├── EstadoMedioDePago.js       enumeración
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
- UC1, front: pide paquete y plan, valida mayor de edad y aplica el bloqueo de 3 minutos tras 5 intentos. El backend exige teléfono y fecha de nacimiento solo en UC1.
- Rutas en `/api/usuarios`: `POST /registro` (UC1), `POST /sesion` (UC2), `POST /recuperacion/pregunta` y `POST /recuperacion` (UC3 y UC4), `GET /perfil`.
- Rutas en `/api/perfiles` (UC5 a UC10): `GET /gestiones`; y en `/clientes`, `/personal` y `/distribuidores`: `GET /` (con `?buscar=`), `GET /:id`, `POST /`, `PUT /:id` y `POST /:id/inhabilitar`. Solo clientes tiene `POST /:id/reactivar`. Solo distribuidores tiene `GET /:id/dominios`, `POST /:id/dominios` (cuerpo `nombre`) y `DELETE /:id/dominios/:nombre`. Cada grupo exige su permiso con `exigirPermiso` (`api/middleware/autorizacion.js`).
- Gateways: usuario, cliente, distribuidor, empleado, administrador, técnico de soporte, rol, permiso y medio de pago, cada uno con las consultas que ya se usan.
- Uso: `cp backend/.env.example backend/.env`, igualar la clave de `DATABASE_URL` con la del `.env` de la raíz, y `npm install` y `npm start` dentro de `backend/`. `npm test` necesita la base levantada.
- Primer administrador: `ADMIN_CORREO=... ADMIN_CONTRASENA=... ADMIN_NOMBRE=... ADMIN_DOCUMENTO=... ADMIN_ROL="Administrador de Personal" npm run crear-admin`. UC9 no sirve para esto porque ya exige un administrador.
- Cifrado de respaldos con `crypto` de Node para los cuatro algoritmos, sin dependencias: `aes-256-gcm`, `chacha20-poly1305`, `bf-cbc` y `des-ede3-cbc`. Blowfish vive en el proveedor legacy de OpenSSL 3, por eso los scripts de `backend/package.json` usan `--openssl-legacy-provider`; sin esa opción el servidor no arranca. Blowfish y Triple DES no detectan alteraciones del archivo. La clave maestra es `CLAVE_RESPALDO`: si se pierde, los respaldos no se pueden descifrar.
- `config/hash.js`, `config/cifrado.js` y `servicios/usuarios/validacion.js` son apoyo de código y no están en el modelo. En el dominio, `iniciarSesión` y `validarRespuesta` devuelven una promesa de booleano, porque bcrypt es asíncrono.

- Contingencia RT4 (UC1, y UC6, UC9 y UC10 al crear y editar): `persistir` en `ServicioDePerfiles`, y `registrarCliente` en UC1, detecta la caída con `config/baseDeDatos.js` y `servicios/respaldo/ServicioDeContingencia.js` cifra los datos con `GestorDeRespaldoCifrado` y los agrega a `RUTA_RESPALDO`, con el algoritmo de `configuracion_cifrado`, que se carga en memoria al arrancar y se relee cada minuto desde el temporizador de `servidor.js`, porque la tabla no se puede leer durante la caída; un cambio aplica sin reiniciar, y si la base no responde se conserva el valor en memoria (AES256 al arrancar). La API responde 202. Lo pendiente es lo que siga en el archivo, no un estado. `npm run reconciliar` lo aplica con `aplicadoresDeRespaldo` cuando la base vuelve y conserva lo que no se pueda aplicar. Una edición respaldada sobrescribe lo que se haya cambiado después en ese perfil.
- UC2 E2: `ServicioDeAutenticacion` responde `ofrecerRecuperacion: true` en cada fallo, como el diagrama, y cuenta en memoria los fallos por correo para marcar `limiteDeIntentosAlcanzado` al quinto, como el caso de uso extendido. No bloquea la cuenta y se pierde al reiniciar.
- UC9: nadie cambia su propio rol ni inhabilita su propia cuenta. Son reglas adicionales a los casos de uso.
- UC8: una franquicia no aceptada se rechaza sin listar otros errores, como en el diagrama. UC6 verifica el documento antes de UC7 y UC8; UC9 y UC10 dependen de la restricción UNIQUE.
- Tarjetas: la vigencia solo se valida al ingresarlas. El front muestra `Inhabilitado` como "Inactivo".
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
- UC16: `GET /api/pagos` devuelve las dos opciones. Las rutas de pagos son solo para titulares (`exigirTitular`), salvo el cobro.
- UC17: `/api/pagos/medios` (GET, POST, PUT/:id, DELETE/:id). Modificar reingresa el número, inactiva la fila anterior e inserta otra, así que el id cambia; los comprobantes viejos conservan su tarjeta. `estado` de `MedioDePago` es borrado lógico: las inactivas no se listan, no se cobran y no cuentan como repetidas. Tarjeta repetida: misma franquicia, número enmascarado y vencimiento (409). Servicios vigentes de A3: el Cliente siempre, el Distribuidor si gestiona al menos un dominio.
- UC17 RT4: `persistir` cubre alta y modificación con `OrigenRespaldo.MedioDePago` (202). `aplicadoresDeRespaldoDePagos` es idempotente, no revive una tarjeta eliminada y se combina en `scripts/reconciliar.js`, porque pagos depende de perfiles. Eliminar no tiene contingencia, los casos de uso solo la piden al guardar.
- Cobro (RF4): ningún caso de uso lo describe. `POST /api/pagos/cobros`, permiso `GenerarFactura`, lo dispara el Administrador como UC12 y recorre facturas `Pendiente` y `Vencida`, cada una en su transacción con la factura bloqueada. Aprobado: comprobante `Exitoso` y factura `Pagada`. Rechazado: comprobante `Fallido`. Sin tarjeta activa no hay comprobante. Sin pago y con `fechaVencimiento` pasada, `Vencida`. Tarjeta elegida: mayor vencimiento, desempate por id, porque `medio_de_pago` no guarda fecha de creación. No se revalida la vigencia al cobrar.
- UC18: `/api/pagos/comprobantes` (listado), `/:id` (detalle) y `/:id/recibo` (PDF, solo `Exitoso`). `ComprobanteDePago` no tiene método de exportar, así que el PDF lo genera `ServicioDePagos`. Cada titular ve solo lo suyo: lo ajeno responde 404.
- UC19 a UC21, actor: solo el Cliente (`exigirCliente`). Las actividades dicen "Cliente o Distribuidor", pero la especificación, el diseño y el modelo solo nombran al Cliente. Los demás reciben 403.
- UC19: `/api/solicitudes` (GET, POST, GET/:id). El formulario pide solo `nombreDominioSolicitado`, en minúsculas y con formato de dominio; los datos del solicitante salen del perfil. Un nombre repetido entre solicitudes no se rechaza: se decide al enviar.
- UC20: formato XML propio, versión `1.0`, con estructura de comando create de EPP, sin authInfo ni XSD. Periodo (1 año) y servidores de nombres son constantes de `SolicitudDeDominio.js`. `<direccion>` se omite si el cliente no la tiene, porque UC1 no la pide. La validación de estructura la da la generación en el dominio más la columna `XML`. `GET /:id/xml` descarga el archivo; `pg` entrega la columna sin declaración, así que el servicio la antepone.
- UC21: `POST /:id/envio`, confirmación simulada, sin RT4; reenviar responde 409. Fuera del caso de uso: al confirmar se crea el `Dominio` a nombre del cliente y se enlaza en `dominioId`, porque UC22 exige un sitio y `ticket.dominioId` es obligatorio. Si el nombre ya está registrado responde 409 y la solicitud sigue `Generada`.
- UC22 a UC25, rutas en `/api/soporte`: el titular usa `sitios` y `tickets`; el técnico (`exigirTécnico`) usa `tablero`, `tickets/:id/toma`, `resolucion`, `nota` y `escalamiento`.
- UC22: el número de ticket es su `id`. `GET /tickets` del titular no incluye la nota, el motivo ni la hora de toma, porque son datos internos de soporte. Ese listado no lo pide ningún caso de uso: es la única forma de ver la solución.
- UC22, distribuidor: no posee dominios, ve los que gestiona por `dominio.distribuidorId`. Lo asigna y quita el Administrador de Canales desde UC10, sin cambiar `clienteId`, con `agregarDominioGestionado` y `quitarDominioGestionado`. Un dominio ya asignado a otro distribuidor responde 409. Sin dominios no abre tickets.
- UC23: `fechaToma`, `motivoEscalamiento` y `notaDeAvance` guardan un solo valor, sin historial. `fechaToma` se limpia al escalar; el motivo es el del último escalamiento manual; la nota sobrevive al escalamiento.
- UC23 E1: `registrarNota` es una operación nueva del patrón State, ausente de la tabla 4.6.2, y devuelve Booleano porque no cambia el estado: es la señal para responder 409.
- UC23 paso 7: la notificación es simulada, un mensaje en la respuesta y el estado visible para el titular. Sin tabla ni correo; Observer se descartó.
- UC23: `TécnicoDeSoporte.verTicketsAsignados()` queda sin lógica; el tablero lo arma el servicio con `TicketGateway` por `nivelActual`.
- UC25: el temporizador es un `setInterval` de 60 s en `servidor.js`, fuera del dominio. Usa `FOR UPDATE SKIP LOCKED`: lo que un técnico esté atendiendo se revisa en la siguiente pasada.
- UC26 a UC28, rutas en `/api/migraciones`, permiso `MigrarDatosLegados` en los tres roles: `POST /?nombreArchivo=` (cuerpo `text/csv`, máximo 5 MB), `POST /:id/pausar`, `POST /:id/reanudar`, `GET /:id/inconsistencias`.
- Archivo legado (supuesto del equipo, el enunciado no lo fija): CSV UTF-8 con encabezado `ID_Cliente_Legado,Nombre,Dominio,Plan de Hosting,Estado,Tarjeta,Correo`. Plan: `Chibcha-Oro/Windows/Mensual`. Tarjeta: `numero|MM/AAAA`; la fecha de expiración es el último día del mes y la franquicia sale del prefijo.
- UC26, cliente migrado: `numeroDocumento` es el id legado y `tipoDocumento` es `Legado`. Contraseña aleatoria; pregunta "Escriba su ID de cliente anterior seguido de los últimos 4 dígitos de su tarjeta" y respuesta con hash de esos datos, así el cliente reclama su cuenta con UC3. Limitación: quien no recuerde su ID anterior no tiene flujo y contacta a soporte, supuesto que la especificación no respalda.
- UC3 y UC4: recuperación con tope de 5 intentos por correo, en memoria; después responde 429 y pide esperar 15 minutos. Se agregó porque esa pregunta se puede adivinar con pocos datos.
- UC26: bloques de 100 con el punto de control en la misma transacción. Cada fila usa savepoint. Mismo id legado ya migrado es duplicado y se omite (A2); correo, dominio o documento de otro cliente van a inconsistencias. `registroOriginal` guarda la tarjeta enmascarada; línea y regla van dentro de `motivo`.
- UC26 E1: archivo con esquema inválido se rechaza antes del primer insert. E2: al reanudar no hay hash del archivo; se exige que las filas hasta la posición guardada estén migradas o en el reporte. E3: si cae la base responde 202 con respaldo `OrigenRespaldo.Migración` y el aplicador deja el proceso en Pausado.
- UC28 E1: una entrada que no se pudo guardar queda retenida en memoria y el resumen la devuelve en `entradasRetenidas`, con `reporteIncompleto: true`. Sin prueba, porque ese fallo no se puede inyectar desde la API.
- Límites de UC26: dos POST simultáneos pueden pasar el control de corrida en curso, y los datos quedan protegidos por los savepoints. `migrados` y `duplicados` del resumen son solo de esa corrida.
- `ProcesoDeMigración`, fuera del modelo: `#registros`, `#vistos`, `siguienteBloque`, `clasificarBloque`, `crearEntrada`, `guardarPunto`, `completar`, `registrosProcesados`. `pausarYGuardarPunto` recibe la fecha. `nombreArchivo` y `administrador` sí están en EA desde P7. `RegistroLegado`, fuera del modelo: `leerArchivo` estático, `cotejar`, `describirMotivo`, `tarjetaParaGuardar`, `#línea`, `#texto`, `#motivos`, `#cotejo`, `#desdeFila`, `#leerTarjeta`, `#validarDuplicados`, `#validarEsquema`, `#validarFormatoSeguro`, `#validarPlan`, `esDuplicado`, `motivos`, `texto`. `ProcesoDeMigración` también tiene `#recordar`. `EstadoTicket.js` tiene funciones de módulo: `devolverACola` y `puedeSubirDeNivel`.
- `npm test` usa `--test-concurrency=1`: el cierre toma a todos los distribuidores activos y chocaría con otras pruebas que crean y borran distribuidores. Las pruebas del cierre usan meses de 2020 y sí pueden recalcular la categoría de distribuidores reales si se corren contra una base con datos: usar base desechable.
