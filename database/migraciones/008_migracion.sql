CREATE TABLE proceso_de_migracion (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"fechaEjecución" DATE NOT NULL,
	"nombreArchivo" VARCHAR(255) NOT NULL,
	"administradorId" UUID NOT NULL REFERENCES administrador (id),
	"estado" estado_migracion NOT NULL DEFAULT 'EnProgreso',
	"ultimoPuntoControlPosicion" INTEGER,
	"ultimoPuntoControlFecha" DATE
);

CREATE TABLE entrada_de_inconsistencia (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"procesoMigracionId" UUID NOT NULL REFERENCES proceso_de_migracion (id) ON DELETE RESTRICT,
	"registroOriginal" TEXT NOT NULL,
	"motivo" VARCHAR(255) NOT NULL,
	"fecha" DATE NOT NULL
);
