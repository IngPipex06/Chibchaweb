CREATE TABLE configuracion_cifrado (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"algoritmoActivo" algoritmo_de_cifrado NOT NULL
);

-- Tabla de una sola fila: guarda el algoritmo vigente.
CREATE UNIQUE INDEX configuracion_cifrado_una_fila ON configuracion_cifrado ((true));
