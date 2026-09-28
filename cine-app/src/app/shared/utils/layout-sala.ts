import { Butaca, TipoButaca } from '../../models/butaca';

const LETRAS_FILAS = 'ABCDEFGHIJKLMNOPQRST';
const FILAS_ACCESIBLES = ['J', 'K'];
const FILAS_VIP = ['R', 'S', 'T'];

function tipoDeFila(letra: string): TipoButaca {
  if (FILAS_ACCESIBLES.includes(letra)) return 'accesible';
  if (FILAS_VIP.includes(letra)) return 'vip';
  return 'estandar';
}

function gruposDeFila(tipo: TipoButaca): number[] {
  if (tipo === 'accesible') return [2, 10, 2];
  return [4, 20, 4];
}

export function limitesDeGrupo(tipo: TipoButaca): number[] {
  const grupos = gruposDeFila(tipo);
  const limites: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < grupos.length - 1; i++) {
    acumulado += grupos[i];
    limites.push(acumulado);
  }
  return limites;
}

export function generarLayoutSala(): Butaca[] {
  const butacas: Butaca[] = [];

  for (let i = 0; i < LETRAS_FILAS.length; i++) {
    const letra = LETRAS_FILAS[i];
    const tipo = tipoDeFila(letra);
    const grupos = gruposDeFila(tipo);

    let columna = 1;
    for (const cantidadEnGrupo of grupos) {
      for (let j = 0; j < cantidadEnGrupo; j++) {
        butacas.push({ fila: letra, columna, tipo });
        columna++;
      }
    }
  }

  return butacas;
}

export function generarLayoutPorFila(): Map<string, Butaca[]> {
  const plano = generarLayoutSala();
  const porFila = new Map<string, Butaca[]>();

  for (const butaca of plano) {
    if (!porFila.has(butaca.fila)) {
      porFila.set(butaca.fila, []);
    }
    porFila.get(butaca.fila)!.push(butaca);
  }

  return porFila;
}