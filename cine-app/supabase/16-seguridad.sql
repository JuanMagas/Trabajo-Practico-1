-- 1. usuarios: el cliente solo puede editar datos de perfil, nunca rol, puntos, crédito ni fecha de nacimiento
drop policy if exists usuarios_insertar_propio on usuarios;

revoke insert, update on usuarios from anon, authenticated;

grant update (nombre, apellido, tipo_sangre, color_ojos, dias_vacaciones)
  on usuarios to authenticated;

-- 2. compras / entradas: solo se crean vía confirmar_compra (SECURITY DEFINER)
drop policy if exists compras_insertar  on compras;
drop policy if exists entradas_insertar on entradas;

-- 3. policies duplicadas
drop policy if exists peliculas_select_publico            on peliculas;
drop policy if exists generos_select_publico              on generos;
drop policy if exists pelicula_generos_select_publico     on pelicula_generos;
drop policy if exists productos_select_publico            on productos;
drop policy if exists categorias_productos_select_publico on categorias_productos;
drop policy if exists combos_lectura                      on combos;
drop policy if exists combo_productos_lectura_publica     on combo_productos;

drop policy if exists peliculas_admin_todo            on peliculas;
drop policy if exists generos_admin_todo              on generos;
drop policy if exists pelicula_generos_admin_todo     on pelicula_generos;
drop policy if exists productos_admin_todo            on productos;
drop policy if exists categorias_productos_admin_todo on categorias_productos;
drop policy if exists combos_admin_total              on combos;
drop policy if exists combo_productos_admin_total     on combo_productos;
drop policy if exists cupones_admin_total             on cupones;

drop policy if exists resenas_insertar_propia on resenas;
drop policy if exists resenas_editar_propia   on resenas;