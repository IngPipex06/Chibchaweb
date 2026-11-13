#!/bin/sh
# Lo ejecuta la imagen de PostgreSQL solo cuando el volumen de datos está vacío.
set -e

for archivo in /migraciones/*.sql /semillas/*.sql; do
	echo "Aplicando $archivo"
	psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$archivo"
done
