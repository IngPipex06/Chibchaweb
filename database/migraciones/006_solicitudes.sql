CREATE TABLE dominio (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"nombre" VARCHAR(255) NOT NULL UNIQUE,
	"clienteId" UUID NOT NULL REFERENCES cliente (id),
	"distribuidorId" UUID REFERENCES distribuidor (id) ON DELETE SET NULL
);

CREATE TABLE solicitud_de_dominio (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"clienteId" UUID NOT NULL REFERENCES cliente (id),
	"dominioId" UUID REFERENCES dominio (id),
	"nombreDominioSolicitado" VARCHAR(255) NOT NULL,
	"estado" estado_solicitud_dominio NOT NULL DEFAULT 'Generada',
	"fechaSolicitud" DATE NOT NULL,
	"contenidoXml" XML,
	"formatoVersionXml" VARCHAR(20)
);
