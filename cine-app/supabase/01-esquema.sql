-- ESQUEMA BASE: tablas, constraints, RLS y policies.
-- Las funciones y triggers están en 08 y 11–15. Ejecutar antes que ellos.

create table if not exists public.usuarios (
  id uuid not null,
  email text not null,
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date not null,
  tipo_sangre text not null,
  color_ojos text not null,
  dias_vacaciones integer not null default 0,
  puntos_fidelidad integer not null default 0,
  credito numeric(10,2) not null default 0,
  rol text not null default 'cliente'::text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.peliculas (
  id uuid not null default gen_random_uuid(),
  titulo text not null,
  sinopsis text not null,
  imagen_url text,
  duracion_minutos integer not null,
  restriccion_edad integer,
  estado text not null default 'proximamente'::text,
  fecha_estreno date not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.generos (
  id uuid not null default gen_random_uuid(),
  nombre text not null
);

create table if not exists public.pelicula_generos (
  pelicula_id uuid not null,
  genero_id uuid not null
);

create table if not exists public.salas (
  id uuid not null default gen_random_uuid(),
  numero integer not null
);

create table if not exists public.funciones (
  id uuid not null default gen_random_uuid(),
  pelicula_id uuid not null,
  sala_id uuid not null,
  fecha date not null,
  hora_inicio time without time zone not null,
  hora_fin time without time zone not null,
  formato text not null,
  idioma text not null,
  precio numeric(10,2) not null,
  precio_preventa numeric(10,2),
  fecha_fin_preventa date,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.butacas_reservadas (
  id uuid not null default gen_random_uuid(),
  funcion_id uuid not null,
  fila text not null,
  columna integer not null,
  sesion_id text not null,
  expira_en timestamp with time zone not null
);

create table if not exists public.compras (
  id uuid not null default gen_random_uuid(),
  usuario_id uuid,
  fecha timestamp with time zone not null default now(),
  total numeric(10,2) not null,
  estado text not null default 'confirmada'::text,
  codigo_qr text not null,
  credito_usado numeric(10,2) not null default 0,
  candy_entregado_en timestamp with time zone,
  funcion_id uuid,
  cancelada_en timestamp with time zone
);

create table if not exists public.entradas (
  id uuid not null default gen_random_uuid(),
  compra_id uuid not null,
  funcion_id uuid not null,
  fila text not null,
  columna integer not null,
  tipo_butaca text not null,
  precio_pagado numeric(10,2) not null
);

create table if not exists public.categorias_productos (
  id uuid not null default gen_random_uuid(),
  nombre text not null
);

create table if not exists public.combos (
  id uuid not null default gen_random_uuid(),
  nombre text not null,
  precio numeric(10,2) not null,
  incluye_entrada boolean not null default false,
  activo boolean not null default true
);

create table if not exists public.productos (
  id uuid not null default gen_random_uuid(),
  categoria_id uuid not null,
  nombre text not null,
  precio numeric(10,2) not null,
  activo boolean not null default true,
  combo_id uuid
);

create table if not exists public.combo_productos (
  combo_id uuid not null,
  producto_id uuid not null,
  cantidad integer not null default 1
);

create table if not exists public.compra_productos (
  id uuid not null default gen_random_uuid(),
  compra_id uuid not null,
  producto_id uuid not null,
  cantidad integer not null,
  precio_unitario numeric not null
);

create table if not exists public.cupones (
  id uuid not null default gen_random_uuid(),
  tipo text not null,
  porcentaje numeric(5,2) not null,
  edad_minima integer,
  activo boolean not null default true
);

create table if not exists public.recompensas (
  id uuid not null default gen_random_uuid(),
  tipo text not null,
  producto_id uuid,
  puntos_costo integer not null,
  activo boolean not null default true
);

create table if not exists public.canjes_puntos (
  id uuid not null default gen_random_uuid(),
  usuario_id uuid not null,
  recompensa_id uuid not null,
  puntos_usados integer not null,
  fecha timestamp with time zone not null default now(),
  codigo text not null default (gen_random_uuid())::text,
  entregado_en timestamp with time zone
);

create table if not exists public.resenas (
  id uuid not null default gen_random_uuid(),
  usuario_id uuid not null,
  pelicula_id uuid not null,
  estrellas integer not null,
  comentario text,
  fecha timestamp with time zone not null default now()
);

create table if not exists public.alertas_pelicula (
  usuario_id uuid not null,
  pelicula_id uuid not null,
  creada_en timestamp with time zone not null default now(),
  avisada_en timestamp with time zone
);

create table if not exists public.log_actividad (
  id uuid not null default gen_random_uuid(),
  usuario_id uuid not null,
  accion text not null,
  detalle text,
  fecha timestamp with time zone not null default now()
);

-- ============ Claves primarias ============
alter table public.usuarios              add constraint usuarios_pkey              primary key (id);
alter table public.peliculas             add constraint peliculas_pkey             primary key (id);
alter table public.generos               add constraint generos_pkey               primary key (id);
alter table public.pelicula_generos      add constraint pelicula_generos_pkey      primary key (pelicula_id, genero_id);
alter table public.salas                 add constraint salas_pkey                 primary key (id);
alter table public.funciones             add constraint funciones_pkey             primary key (id);
alter table public.butacas_reservadas    add constraint butacas_reservadas_pkey    primary key (id);
alter table public.compras               add constraint compras_pkey               primary key (id);
alter table public.entradas              add constraint entradas_pkey              primary key (id);
alter table public.categorias_productos  add constraint categorias_productos_pkey  primary key (id);
alter table public.combos                add constraint combos_pkey                primary key (id);
alter table public.productos             add constraint productos_pkey             primary key (id);
alter table public.combo_productos       add constraint combo_productos_pkey       primary key (combo_id, producto_id);
alter table public.compra_productos      add constraint compra_productos_pkey      primary key (id);
alter table public.cupones               add constraint cupones_pkey               primary key (id);
alter table public.recompensas           add constraint recompensas_pkey           primary key (id);
alter table public.canjes_puntos         add constraint canjes_puntos_pkey         primary key (id);
alter table public.resenas               add constraint resenas_pkey               primary key (id);
alter table public.alertas_pelicula      add constraint alertas_pelicula_pkey      primary key (usuario_id, pelicula_id);
alter table public.log_actividad         add constraint log_actividad_pkey         primary key (id);

-- ============ Únicos ============
alter table public.butacas_reservadas   add constraint butacas_reservadas_funcion_id_fila_columna_key unique (funcion_id, fila, columna);
alter table public.entradas             add constraint entradas_funcion_id_fila_columna_key             unique (funcion_id, fila, columna);
alter table public.categorias_productos add constraint categorias_productos_nombre_key                  unique (nombre);
alter table public.compras              add constraint compras_codigo_qr_key                            unique (codigo_qr);
alter table public.generos              add constraint generos_nombre_key                               unique (nombre);
alter table public.resenas              add constraint resenas_usuario_pelicula_unico                   unique (usuario_id, pelicula_id);
alter table public.salas                add constraint salas_numero_key                                 unique (numero);

-- ============ Claves foráneas ============
alter table public.usuarios           add constraint usuarios_id_fkey                   foreign key (id)          references auth.users(id) on delete cascade;
alter table public.pelicula_generos   add constraint pelicula_generos_pelicula_id_fkey  foreign key (pelicula_id) references peliculas(id) on delete cascade;
alter table public.pelicula_generos   add constraint pelicula_generos_genero_id_fkey    foreign key (genero_id)   references generos(id)   on delete cascade;
alter table public.funciones          add constraint funciones_pelicula_id_fkey         foreign key (pelicula_id) references peliculas(id) on delete cascade;
alter table public.funciones          add constraint funciones_sala_id_fkey             foreign key (sala_id)     references salas(id);
alter table public.butacas_reservadas add constraint butacas_reservadas_funcion_id_fkey foreign key (funcion_id) references funciones(id) on delete cascade;
alter table public.compras            add constraint compras_usuario_id_fkey            foreign key (usuario_id)  references usuarios(id);
alter table public.compras            add constraint compras_funcion_id_fkey            foreign key (funcion_id)  references funciones(id);
alter table public.entradas           add constraint entradas_compra_id_fkey            foreign key (compra_id)   references compras(id)   on delete cascade;
alter table public.entradas           add constraint entradas_funcion_id_fkey           foreign key (funcion_id)  references funciones(id);
alter table public.productos          add constraint productos_categoria_id_fkey        foreign key (categoria_id) references categorias_productos(id);
alter table public.productos          add constraint productos_combo_id_fkey            foreign key (combo_id)    references combos(id);
alter table public.combo_productos    add constraint combo_productos_combo_id_fkey      foreign key (combo_id)    references combos(id)    on delete cascade;
alter table public.combo_productos    add constraint combo_productos_producto_id_fkey   foreign key (producto_id) references productos(id);
alter table public.compra_productos   add constraint compra_productos_compra_id_fkey    foreign key (compra_id)   references compras(id)   on delete cascade;
alter table public.compra_productos   add constraint compra_productos_producto_id_fkey  foreign key (producto_id) references productos(id);
alter table public.recompensas        add constraint recompensas_producto_id_fkey       foreign key (producto_id) references productos(id);
alter table public.canjes_puntos      add constraint canjes_puntos_usuario_id_fkey      foreign key (usuario_id)  references usuarios(id);
alter table public.canjes_puntos      add constraint canjes_puntos_recompensa_id_fkey   foreign key (recompensa_id) references recompensas(id);
alter table public.resenas            add constraint resenas_usuario_id_fkey            foreign key (usuario_id)  references usuarios(id);
alter table public.resenas            add constraint resenas_pelicula_id_fkey           foreign key (pelicula_id) references peliculas(id);
alter table public.alertas_pelicula   add constraint alertas_pelicula_usuario_id_fkey   foreign key (usuario_id)  references usuarios(id)  on delete cascade;
alter table public.alertas_pelicula   add constraint alertas_pelicula_pelicula_id_fkey  foreign key (pelicula_id) references peliculas(id) on delete cascade;
alter table public.log_actividad      add constraint log_actividad_usuario_id_fkey      foreign key (usuario_id)  references usuarios(id);

-- ============ Checks ============
alter table public.usuarios        add constraint usuarios_rol_check          check (rol = any (array['cliente', 'empleado', 'admin']));
alter table public.usuarios        add constraint usuarios_tipo_sangre_check  check (tipo_sangre = any (array['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']));
alter table public.peliculas       add constraint peliculas_duracion_minutos_check  check (duracion_minutos > 0);
alter table public.peliculas       add constraint peliculas_estado_check            check (estado = any (array['cartelera', 'proximamente', 'archivada']));
alter table public.peliculas       add constraint peliculas_restriccion_edad_check  check (restriccion_edad = any (array[13, 18]));
alter table public.funciones       add constraint chk_horario                 check (hora_fin > hora_inicio);
alter table public.funciones       add constraint funciones_formato_check     check (formato = any (array['2D', '3D', '4D', '5D']));
alter table public.funciones       add constraint funciones_idioma_check      check (idioma = any (array['castellano', 'subtitulada']));
alter table public.compras         add constraint compras_estado_check        check (estado = any (array['confirmada', 'validada', 'cancelada']));
alter table public.entradas        add constraint entradas_tipo_butaca_check  check (tipo_butaca = any (array['estandar', 'accesible', 'vip']));
alter table public.compra_productos add constraint compra_productos_cantidad_check check (cantidad > 0);
alter table public.productos       add constraint productos_precio_positivo   check (precio >= 0);
alter table public.cupones         add constraint cupones_tipo_check          check (tipo = any (array['primera-compra', 'segmentado-edad']));
alter table public.cupones         add constraint cupones_porcentaje_rango    check (porcentaje >= 1 and porcentaje <= 100);
alter table public.cupones         add constraint cupones_edad_segmentado     check (tipo <> 'segmentado-edad' or edad_minima is not null);
alter table public.recompensas     add constraint recompensas_tipo_check      check (tipo = any (array['entrada', 'producto']));
alter table public.recompensas     add constraint recompensas_puntos_positivos check (puntos_costo > 0);
alter table public.recompensas     add constraint recompensas_tipo_producto   check (
  (tipo = 'producto' and producto_id is not null) or (tipo = 'entrada' and producto_id is null)
);
alter table public.resenas         add constraint resenas_estrellas_rango     check (estrellas >= 1 and estrellas <= 5);
alter table public.resenas         add constraint resenas_comentario_corto    check (comentario is null or char_length(comentario) <= 280);
alter table public.log_actividad   add constraint log_actividad_accion_check  check (
  accion = any (array['crear-funcion', 'modificar-precio', 'validar-qr', 'entregar-candy', 'entregar-canje'])
);

-- ============ RLS activado en todas las tablas ============
alter table public.usuarios             enable row level security;
alter table public.peliculas            enable row level security;
alter table public.generos              enable row level security;
alter table public.pelicula_generos     enable row level security;
alter table public.salas                enable row level security;
alter table public.funciones            enable row level security;
alter table public.butacas_reservadas   enable row level security;
alter table public.compras              enable row level security;
alter table public.entradas             enable row level security;
alter table public.categorias_productos enable row level security;
alter table public.combos               enable row level security;
alter table public.productos            enable row level security;
alter table public.combo_productos      enable row level security;
alter table public.compra_productos     enable row level security;
alter table public.cupones              enable row level security;
alter table public.recompensas          enable row level security;
alter table public.canjes_puntos        enable row level security;
alter table public.resenas              enable row level security;
alter table public.alertas_pelicula     enable row level security;
alter table public.log_actividad        enable row level security;

-- ============ Policies: lectura pública del catálogo ============
create policy catalogo_lectura_publica         on public.peliculas            for select using (true);
create policy generos_lectura_publica          on public.generos              for select using (true);
create policy pelicula_generos_lectura_publica on public.pelicula_generos     for select using (true);
create policy salas_lectura_publica            on public.salas                for select using (true);
create policy funciones_lectura_publica        on public.funciones            for select using (true);
create policy productos_lectura_publica        on public.productos            for select using (true);
create policy categorias_lectura_publica       on public.categorias_productos for select using (true);
create policy cupones_lectura_publica          on public.cupones              for select using (true);
create policy resenas_lectura_publica          on public.resenas              for select using (true);
create policy combos_lectura_publica           on public.combos               for select using (true);
create policy combo_productos_lectura          on public.combo_productos      for select to anon, authenticated using (true);
create policy recompensas_lectura_publica      on public.recompensas          for select using (true);
create policy entradas_lectura_publica         on public.entradas             for select using (true);

-- ============ Policies: escritura solo admin ============
create policy catalogo_escritura_admin         on public.peliculas            for all using (is_admin());
create policy funciones_escritura_admin        on public.funciones            for all using (is_admin());
create policy productos_escritura_admin        on public.productos            for all using (is_admin());
create policy cupones_escritura_admin          on public.cupones              for all using (is_admin());
create policy salas_escritura_admin            on public.salas                for all using (is_admin());
create policy combos_escritura_admin           on public.combos               for all using (is_admin());
create policy combo_productos_escritura_admin  on public.combo_productos      for all using (is_admin());
create policy recompensas_escritura_admin      on public.recompensas          for all using (is_admin());

-- Los géneros y la tabla pelicula_generos también las edita el admin
create policy generos_escritura_admin          on public.generos              for all using (is_admin());
create policy pelicula_generos_escritura_admin on public.pelicula_generos     for all using (is_admin());
create policy categorias_escritura_admin       on public.categorias_productos for all using (is_admin());

-- ============ Policies: datos del usuario ============
create policy usuarios_ver_propio     on public.usuarios for select using (auth.uid() = id or is_admin());
create policy usuarios_editar_propio  on public.usuarios for update using (auth.uid() = id);

create policy compras_ver_propias      on public.compras for select using (usuario_id = auth.uid() or is_staff());
create policy compras_actualizar_staff on public.compras for update using (is_staff());

create policy canjes_ver_propios on public.canjes_puntos for select using (auth.uid() = usuario_id or is_admin());

create policy resenas_select_propia on public.resenas for select to authenticated using (usuario_id = auth.uid());
create policy resenas_insert_propia on public.resenas for insert to authenticated with check (usuario_id = auth.uid());
create policy resenas_update_propia on public.resenas for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy resenas_delete_propia on public.resenas for delete to authenticated using (usuario_id = auth.uid());

create policy alertas_ver_propias   on public.alertas_pelicula for select to authenticated using (usuario_id = auth.uid());
create policy alertas_crear_propias on public.alertas_pelicula for insert to authenticated with check (usuario_id = auth.uid());
create policy alertas_borrar_propias on public.alertas_pelicula for delete to authenticated using (usuario_id = auth.uid());

create policy log_insertar_staff on public.log_actividad for insert with check (is_staff());
create policy log_leer_admin     on public.log_actividad for select using (is_admin());

-- Reservas temporales de butacas: las ven y modifican todos (Realtime del mapa de asientos)
create policy butacas_reservadas_todos on public.butacas_reservadas for all using (true) with check (true);

-- compras y entradas NO tienen policy de INSERT: solo se crean con confirmar_compra (SECURITY DEFINER)

-- ============ Permisos de columna en usuarios (ver 16-seguridad.sql) ============
revoke insert, update on public.usuarios from anon, authenticated;
grant update (nombre, apellido, tipo_sangre, color_ojos, dias_vacaciones) on public.usuarios to authenticated;