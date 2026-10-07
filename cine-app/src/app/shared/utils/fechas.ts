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

// "YYYY-MM-DD" de hoy en hora de Buenos Aires
export function hoyArgentina(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: ZONA }).format(new Date());
}

// Suma (o resta) días a un "YYYY-MM-DD" sin depender de la zona horaria del navegador
export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

// ¿La función todavía no empezó? (fecha 'YYYY-MM-DD', hora 'HH:mm' o 'HH:mm:ss')
export function esFutura(fecha: string, horaInicio: string): boolean {
  return `${fecha} ${horaInicio.slice(0, 5)}` > ahoraArgentina();
}
