const ZONA = 'America/Argentina/Buenos_Aires';

// "YYYY-MM-DD HH:mm" en hora de Buenos Aires. Con este formato, comparar dos fechas
// como texto equivale a compararlas cronológicamente.
export function ahoraArgentina(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: ZONA,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
}

// ¿La función todavía no empezó? (fecha 'YYYY-MM-DD', hora 'HH:mm' o 'HH:mm:ss')
export function esFutura(fecha: string, horaInicio: string): boolean {
  return `${fecha} ${horaInicio.slice(0, 5)}` > ahoraArgentina();
}

// "lunes 6 de octubre"
export function etiquetaDia(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// "lun, 6 oct"
export function etiquetaDiaCorto(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}