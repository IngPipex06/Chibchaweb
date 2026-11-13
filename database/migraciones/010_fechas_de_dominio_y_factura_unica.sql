ALTER TABLE dominio
	ADD COLUMN "fechaRegistro" DATE NOT NULL DEFAULT CURRENT_DATE,
	ADD COLUMN "fechaAsignación" DATE;

UPDATE dominio SET "fechaAsignación" = CURRENT_DATE WHERE "distribuidorId" IS NOT NULL;

ALTER TABLE factura ADD UNIQUE ("usuarioPagadorId", "período");
