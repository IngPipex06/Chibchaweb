-- Los roles son los subroles de Administrador de los casos de uso.
INSERT INTO rol ("id", "nombre") VALUES
	(gen_random_uuid(), 'Administrador de Clientes'),
	(gen_random_uuid(), 'Administrador de Personal'),
	(gen_random_uuid(), 'Administrador de Canales');

INSERT INTO permiso ("id", "rolId", "nombre", "descripcion")
SELECT gen_random_uuid(), r."id", p."nombre", p."descripcion"
FROM (VALUES
	('Administrador de Clientes', 'GestionarPerfilDeClientes', 'UC6: alta, edición, inhabilitación y consulta de clientes'),
	('Administrador de Personal', 'GestionarPerfilDePersonalInterno', 'UC9: alta, edición, inhabilitación y consulta del personal interno'),
	('Administrador de Canales', 'GestionarPerfilDeDistribuidores', 'UC10: alta, edición, inhabilitación y consulta de distribuidores')
) AS p ("rol", "nombre", "descripcion")
JOIN rol r ON r."nombre" = p."rol";

INSERT INTO configuracion_cifrado ("id", "algoritmoActivo") VALUES (gen_random_uuid(), 'AES256');
