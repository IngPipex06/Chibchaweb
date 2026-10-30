CREATE TABLE medio_de_pago (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"titularId" UUID NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
	"tipoTarjeta" tipo_tarjeta NOT NULL,
	"numeroEnmascarado" VARCHAR(25) NOT NULL,
	"fechaExpiración" DATE NOT NULL
);
