insert into categorias_productos (nombre) values ('Pochoclos'), ('Bebidas'), ('Golosinas');

insert into productos (categoria_id, nombre, precio)
select id, 'Pochoclo grande', 4500 from categorias_productos where nombre = 'Pochoclos';
insert into productos (categoria_id, nombre, precio)
select id, 'Pochoclo mediano', 3500 from categorias_productos where nombre = 'Pochoclos';
insert into productos (categoria_id, nombre, precio)
select id, 'Gaseosa 500 ml', 2500 from categorias_productos where nombre = 'Bebidas';
insert into productos (categoria_id, nombre, precio)
select id, 'Agua mineral', 1800 from categorias_productos where nombre = 'Bebidas';
insert into productos (categoria_id, nombre, precio)
select id, 'Chocolate', 2000 from categorias_productos where nombre = 'Golosinas';
