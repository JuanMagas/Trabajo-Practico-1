export function obtenerSesionCompraId(): string {
  const clave = 'sesionCompraId';
  let id = sessionStorage.getItem(clave);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(clave, id);
  }
  return id;
}