CREATE SEQUENCE factura_numero_seq;

CREATE TABLE factura (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"usuarioPagadorId" UUID NOT NULL REFERENCES usuario (id),
	"número" VARCHAR(50) NOT NULL UNIQUE,
	"fechaEmisión" DATE NOT NULL,
	"fechaVencimiento" DATE NOT NULL,
	"período" VARCHAR(20) NOT NULL,
	"monto" NUMERIC(12,2) NOT NULL,
	"estado" estado_factura NOT NULL DEFAULT 'Pendiente'
);

CREATE TABLE cierre_mensual (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"período" DATE NOT NULL UNIQUE,
	"fechaEjecución" DATE
);

CREATE TABLE comision (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"cierreMensualId" UUID NOT NULL REFERENCES cierre_mensual (id) ON DELETE RESTRICT,
	"distribuidorId" UUID NOT NULL REFERENCES distribuidor (id),
	"monto" NUMERIC(12,2) NOT NULL,
	"porcentajeAplicado" NUMERIC(5,2) NOT NULL,
	"período" DATE NOT NULL,
	UNIQUE ("distribuidorId", "período")
);

CREATE TABLE cheque (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"comisionId" UUID NOT NULL UNIQUE REFERENCES comision (id),
	"número" VARCHAR(50) NOT NULL,
	"monto" NUMERIC(12,2) NOT NULL,
	"fechaGeneración" DATE NOT NULL
);
