CREATE TABLE usuario (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"correo" VARCHAR(255) NOT NULL UNIQUE,
	"contraseña" VARCHAR(255) NOT NULL,
	"estado" estado_usuario NOT NULL DEFAULT 'Activo',
	"preguntaSeguridad" VARCHAR(255),
	"respuestaSeguridad" VARCHAR(255)
);

CREATE TABLE cliente (
	"id" UUID PRIMARY KEY REFERENCES usuario (id),
	"nombreCompleto" VARCHAR(255) NOT NULL,
	"tipoDocumento" VARCHAR(50) NOT NULL,
	"numeroDocumento" VARCHAR(50) NOT NULL UNIQUE,
	"teléfono" VARCHAR(30),
	"fechaNacimiento" DATE,
	"paqueteHosting" paquete_de_hosting NOT NULL,
	"planDePago" plan_de_pago NOT NULL,
	"direccionCalle" VARCHAR(255),
	"direccionCiudad" VARCHAR(100),
	"direccionDepartamentoOPais" VARCHAR(100),
	"direccionCodigoPostal" VARCHAR(20)
);

CREATE TABLE distribuidor (
	"id" UUID PRIMARY KEY REFERENCES usuario (id),
	"razónSocial" VARCHAR(255) NOT NULL,
	"nit" VARCHAR(50) NOT NULL UNIQUE,
	"categoría" categoria_distribuidor NOT NULL,
	"comisiónAplicable" NUMERIC(5,2) NOT NULL,
	"datosDeContacto" VARCHAR(255)
);

CREATE TABLE empleado (
	"id" UUID PRIMARY KEY REFERENCES usuario (id),
	"nombreCompleto" VARCHAR(255) NOT NULL,
	"documento" VARCHAR(50) NOT NULL UNIQUE,
	"cargo" VARCHAR(100),
	"teléfono" VARCHAR(30)
);

CREATE TABLE rol (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"nombre" VARCHAR(100) NOT NULL
);

CREATE TABLE permiso (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"rolId" UUID NOT NULL REFERENCES rol (id),
	"nombre" VARCHAR(100) NOT NULL,
	"descripcion" VARCHAR(255)
);

CREATE TABLE administrador (
	"id" UUID PRIMARY KEY REFERENCES empleado (id),
	"rolId" UUID NOT NULL REFERENCES rol (id)
);

CREATE TABLE tecnico_de_soporte (
	"id" UUID PRIMARY KEY REFERENCES empleado (id),
	"nivelDeServicio" nivel_de_servicio NOT NULL
);
