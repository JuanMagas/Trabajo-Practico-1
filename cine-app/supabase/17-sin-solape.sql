create extension if not exists btree_gist;

alter table public.funciones
  add constraint funciones_sin_solape
  exclude using gist (
    sala_id with =,
    tsrange(fecha + hora_inicio, (fecha + hora_fin) + interval '30 minutes') with &&
  );