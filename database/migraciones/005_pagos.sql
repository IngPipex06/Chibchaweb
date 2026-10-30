CREATE TABLE comprobante_de_pago (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"facturaId" UUID NOT NULL REFERENCES factura (id),
	"medioDePagoId" UUID NOT NULL REFERENCES medio_de_pago (id),
	"monto" NUMERIC(12,2) NOT NULL,
	"fecha" DATE NOT NULL,
	"estado" estado_comprobante NOT NULL
);
