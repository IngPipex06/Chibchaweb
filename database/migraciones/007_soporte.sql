CREATE TABLE ticket (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"solicitanteId" UUID NOT NULL REFERENCES usuario (id),
	"tecnicoAsignadoId" UUID REFERENCES tecnico_de_soporte (id),
	"dominioId" UUID NOT NULL REFERENCES dominio (id),
	"descripción" VARCHAR(500) NOT NULL,
	"prioridad" prioridad NOT NULL,
	"estado" estado_ticket NOT NULL DEFAULT 'Abierto',
	"fechaCreación" TIMESTAMP NOT NULL,
	"nivelActual" nivel_de_servicio NOT NULL DEFAULT 'Nivel1',
	"fechaInicioSLA" TIMESTAMP NOT NULL,
	"solución" VARCHAR(500),
	"fechaToma" TIMESTAMP,
	"motivoEscalamiento" VARCHAR(500),
	"notaDeAvance" VARCHAR(500)
);
