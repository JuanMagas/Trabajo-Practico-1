-- DATOS DE DEMO (opcional). Ejecutar después de 01–16.
-- Fechas relativas a hoy (hora de Buenos Aires): se puede correr el día de la defensa.
-- Idempotente: si ya existe la película "La Última Función", no hace nada.
-- No crea usuarios (los crea Supabase Auth): registrarlos desde la app y luego
-- promover rol con el UPDATE del final.

do $$
declare
  hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_cat_pochoclos uuid;
  v_cat_bebidas   uuid;
  v_cat_golosinas uuid;
  v_cat_combos    uuid;
  v_combo1 uuid := gen_random_uuid();
  v_combo2 uuid := gen_random_uuid();
begin
  if exists (select 1 from peliculas where titulo = 'La Última Función') then
    raise notice 'Datos de demo ya cargados; no se hace nada.';
    return;
  end if;

  -- ===== Salas =====
  insert into salas (numero) values (1), (2), (3)
  on conflict (numero) do nothing;

  -- ===== Géneros =====
  insert into generos (nombre) values
    ('Drama'), ('Comedia'), ('Acción'), ('Ciencia ficción'), ('Terror'),
    ('Animación'), ('Aventura'), ('Suspenso'), ('Romance')
  on conflict (nombre) do nothing;

  -- ===== Películas =====
  insert into peliculas (titulo, sinopsis, imagen_url, duracion_minutos, restriccion_edad, estado, fecha_estreno)
  values
    ('La Última Función',
     'El dueño de un cine de barrio en Buenos Aires decide proyectar una última película antes de cerrar para siempre.',
     'https://placehold.co/400x600/1f1a17/c9a227.png?text=La+Ultima+Funcion',
     118, null, 'cartelera', hoy - 30),
    ('Noche en el Obelisco',
     'Tres amigos pierden las llaves del auto y recorren la ciudad de madrugada en una noche que no van a olvidar.',
     'https://placehold.co/400x600/8f1d2c/f7f1e5.png?text=Noche+en+el+Obelisco',
     105, 13, 'cartelera', hoy - 20),
    ('Cráter',
     'Una expedición científica baja a un cráter recién descubierto en la Patagonia y encuentra algo que no debía despertar.',
     'https://placehold.co/400x600/1f1a17/f7f1e5.png?text=Crater',
     132, 13, 'cartelera', hoy - 14),
    ('El Eco del Pantano',
     'Una familia se muda a una casa del Delta del Tigre y empieza a escuchar voces que repiten lo que dicen.',
     'https://placehold.co/400x600/000000/8f1d2c.png?text=El+Eco+del+Pantano',
     98, 18, 'cartelera', hoy - 10),
    ('Pampa Roja',
     'Un comisario retirado vuelve a su pueblo para saldar una deuda con el hombre que lo traicionó hace veinte años.',
     'https://placehold.co/400x600/8f1d2c/c9a227.png?text=Pampa+Roja',
     124, 18, 'cartelera', hoy - 7),
    ('Chiquitos al Rescate',
     'Un grupo de animalitos del zoológico se escapa para encontrar a su cuidador, perdido en la ciudad.',
     'https://placehold.co/400x600/c9a227/1f1a17.png?text=Chiquitos+al+Rescate',
     92, null, 'cartelera', hoy - 21),
    ('Sombras de Mayo',
     'Una periodista investiga una desaparición ocurrida durante una noche de protestas y descubre que nadie dice la verdad.',
     'https://placehold.co/400x600/1f1a17/d9cdb4.png?text=Sombras+de+Mayo',
     110, 13, 'proximamente', hoy + 5),
    ('Tango Final',
     'Dos bailarines que se separaron en el escenario vuelven a encontrarse para una última presentación.',
     'https://placehold.co/400x600/8f1d2c/f7f1e5.png?text=Tango+Final',
     101, null, 'proximamente', hoy + 9),
    ('Horizonte Sur',
     'La primera misión tripulada a la Luna despega desde Sudamérica y la tripulación deja de recibir órdenes de la Tierra.',
     'https://placehold.co/400x600/1f1a17/c9a227.png?text=Horizonte+Sur',
     128, 13, 'proximamente', hoy + 20);

  -- ===== Géneros por película =====
  insert into pelicula_generos (pelicula_id, genero_id)
  select p.id, g.id
    from (values
      ('La Última Función',    'Drama'),
      ('La Última Función',    'Romance'),
      ('Noche en el Obelisco', 'Comedia'),
      ('Noche en el Obelisco', 'Aventura'),
      ('Cráter',               'Ciencia ficción'),
      ('Cráter',               'Aventura'),
      ('El Eco del Pantano',   'Terror'),
      ('El Eco del Pantano',   'Suspenso'),
      ('Pampa Roja',           'Acción'),
      ('Pampa Roja',           'Drama'),
      ('Chiquitos al Rescate', 'Animación'),
      ('Chiquitos al Rescate', 'Aventura'),
      ('Sombras de Mayo',      'Suspenso'),
      ('Sombras de Mayo',      'Drama'),
      ('Tango Final',          'Drama'),
      ('Tango Final',          'Romance'),
      ('Horizonte Sur',        'Ciencia ficción'),
      ('Horizonte Sur',        'Acción')
    ) as x(titulo, genero)
    join peliculas p on p.titulo = x.titulo
    join generos g   on g.nombre = x.genero;

  -- ===== Funciones =====
  -- (título, sala, días desde hoy, hora, formato, idioma, precio, precio preventa, días de fin de preventa)
  -- hora_fin = hora_inicio + duración; todas terminan antes de las 00:00 y dejan ≥ 30 min entre sí.
  insert into funciones (pelicula_id, sala_id, fecha, hora_inicio, hora_fin, formato, idioma, precio, precio_preventa, fecha_fin_preventa)
  select p.id, s.id, hoy + x.dia, x.hora::time,
         (x.hora::time + (p.duracion_minutos || ' minutes')::interval)::time,
         x.formato, x.idioma, x.precio, x.precio_pre,
         case when x.fin_pre is null then null else hoy + x.fin_pre end
    from (values
      -- HOY
      ('Cráter',               1, 0, '16:30', '3D', 'castellano',  8000, null::numeric, null::int),
      ('Chiquitos al Rescate', 1, 0, '19:30', '2D', 'castellano',  6500, null, null),
      ('Pampa Roja',           1, 0, '21:45', '2D', 'subtitulada', 6500, null, null),
      ('La Última Función',    2, 0, '16:00', '2D', 'castellano',  6500, null, null),
      ('Noche en el Obelisco', 2, 0, '18:45', '2D', 'castellano',  6500, null, null),
      ('El Eco del Pantano',   2, 0, '21:15', '4D', 'castellano',  9500, null, null),
      ('Chiquitos al Rescate', 3, 0, '16:15', '2D', 'castellano',  6500, null, null),
      ('Cráter',               3, 0, '18:30', '5D', 'subtitulada', 11000, null, null),
      ('La Última Función',    3, 0, '21:15', '2D', 'subtitulada', 6500, null, null),
      -- MAÑANA
      ('Chiquitos al Rescate', 1, 1, '15:00', '2D', 'castellano',  6500, null, null),
      ('Noche en el Obelisco', 1, 1, '17:30', '3D', 'castellano',  8000, null, null),
      ('Pampa Roja',           1, 1, '20:00', '2D', 'castellano',  6500, null, null),
      ('Cráter',               2, 1, '16:00', '3D', 'subtitulada', 8000, null, null),
      ('El Eco del Pantano',   2, 1, '19:00', '2D', 'subtitulada', 6500, null, null),
      ('La Última Función',    2, 1, '21:30', '2D', 'castellano',  6500, null, null),
      ('Noche en el Obelisco', 3, 1, '17:00', '4D', 'castellano',  9500, null, null),
      ('Cráter',               3, 1, '19:30', '5D', 'castellano', 11000, null, null),
      -- PASADO MAÑANA
      ('Cráter',               1, 2, '17:00', '2D', 'castellano',  6500, null, null),
      ('Pampa Roja',           2, 2, '20:00', '2D', 'castellano',  6500, null, null),
      ('Chiquitos al Rescate', 3, 2, '15:30', '2D', 'castellano',  6500, null, null),
      -- PREVENTA: Sombras de Mayo (estreno en 5 días, venta abierta desde hoy)
      ('Sombras de Mayo',      1, 5, '18:00', '2D', 'castellano',  7000, 5500, 4),
      ('Sombras de Mayo',      2, 5, '21:00', '3D', 'subtitulada', 8500, 6500, 4),
      ('Sombras de Mayo',      1, 6, '18:00', '2D', 'castellano',  7000, 5500, 4)
    ) as x(titulo, sala, dia, hora, formato, idioma, precio, precio_pre, fin_pre)
    join peliculas p on p.titulo = x.titulo
    join salas s     on s.numero = x.sala;

  -- ===== Categorías y productos =====
  insert into categorias_productos (nombre) values ('Pochoclos'), ('Bebidas'), ('Golosinas'), ('Combos')
  on conflict (nombre) do nothing;

  select id into v_cat_pochoclos from categorias_productos where nombre = 'Pochoclos';
  select id into v_cat_bebidas   from categorias_productos where nombre = 'Bebidas';
  select id into v_cat_golosinas from categorias_productos where nombre = 'Golosinas';
  select id into v_cat_combos    from categorias_productos where nombre = 'Combos';

  insert into productos (categoria_id, nombre, precio) values
    (v_cat_pochoclos, 'Pochoclos chicos',     3500),
    (v_cat_pochoclos, 'Pochoclos medianos',   4800),
    (v_cat_pochoclos, 'Pochoclos grandes',    6200),
    (v_cat_pochoclos, 'Pochoclos dulces',     5200),
    (v_cat_bebidas,   'Gaseosa 500 ml',       2800),
    (v_cat_bebidas,   'Gaseosa 1 litro',      4200),
    (v_cat_bebidas,   'Agua mineral',         2000),
    (v_cat_golosinas, 'Alfajor',              1800),
    (v_cat_golosinas, 'Chocolate',            2500),
    (v_cat_golosinas, 'Caramelos',            1500);

  -- ===== Combos (con su producto virtual, mismo id) =====
  insert into combos (id, nombre, precio, incluye_entrada, activo) values
    (v_combo1, 'Pareja',        10500, false, true),
    (v_combo2, 'Cine completo', 11900, true,  true);

  insert into combo_productos (combo_id, producto_id, cantidad)
  select v_combo1, id, 1 from productos where nombre = 'Pochoclos grandes'
  union all
  select v_combo1, id, 2 from productos where nombre = 'Gaseosa 500 ml'
  union all
  select v_combo2, id, 1 from productos where nombre = 'Pochoclos medianos'
  union all
  select v_combo2, id, 1 from productos where nombre = 'Gaseosa 500 ml'
  union all
  select v_combo2, id, 1 from productos where nombre = 'Alfajor';

  insert into productos (id, categoria_id, nombre, precio, activo, combo_id) values
    (v_combo1, v_cat_combos, 'Combo Pareja',        10500, true, v_combo1),
    (v_combo2, v_cat_combos, 'Combo Cine completo', 11900, true, v_combo2);

  -- ===== Cupones (solo si no hay de ese tipo) =====
  insert into cupones (tipo, porcentaje, edad_minima, activo)
  select 'primera-compra', 20, null, true
   where not exists (select 1 from cupones where tipo = 'primera-compra');

  insert into cupones (tipo, porcentaje, edad_minima, activo)
  select 'segmentado-edad', 15, 50, true
   where not exists (select 1 from cupones where tipo = 'segmentado-edad');

  -- ===== Recompensas =====
  insert into recompensas (tipo, producto_id, puntos_costo, activo)
  select 'entrada', null, 8000, true
   where not exists (select 1 from recompensas where tipo = 'entrada');

  insert into recompensas (tipo, producto_id, puntos_costo, activo)
  select 'producto', id, 3000, true from productos where nombre = 'Pochoclos medianos'
   and not exists (select 1 from recompensas r where r.producto_id = productos.id);

  insert into recompensas (tipo, producto_id, puntos_costo, activo)
  select 'producto', id, 2000, true from productos where nombre = 'Gaseosa 500 ml'
   and not exists (select 1 from recompensas r where r.producto_id = productos.id);
end $$;

-- ===== Roles (después de registrar los usuarios desde la app) =====
-- update usuarios set rol = 'admin'    where email = 'admin@cine.com';
-- update usuarios set rol = 'empleado' where email = 'empleado@cine.com';
