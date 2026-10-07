import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { CompraConfirmada, ResumenCompra } from '../../models/resumen-compra';
import { ItemPedido } from '../../models/producto';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private supabase = inject(SupabaseClientService).client;

  // El cliente manda solo ids y cantidades; el servidor pone nombres y precios.
  private aPayload(productos: ItemPedido[]) {
    return productos.map((p) => ({ producto_id: p.productoId, cantidad: p.cantidad }));
  }

  // Pide al servidor el resumen (precios, descuento, total) de las butacas reservadas y el candy elegido.
  async calcular(
    funcionId: string,
    sesionId: string,
    productos: ItemPedido[] = []
  ): Promise<{ resumen?: ResumenCompra; error?: string }> {
    const { data, error } = await this.supabase.rpc('calcular_compra', {
      p_funcion_id: funcionId,
      p_sesion_id: sesionId,
      p_productos: this.aPayload(productos),
    });

    if (error) return { error: error.message };
    return { resumen: this.mapResumen(data) };
  }

  // Confirma la compra (todo o nada, en el servidor). Devuelve el código del QR.
  async confirmar(
    funcionId: string,
    sesionId: string,
    productos: ItemPedido[] = []
  ): Promise<{ codigo?: string; error?: string }> {
    const { data, error } = await this.supabase.rpc('confirmar_compra', {
      p_funcion_id: funcionId,
      p_sesion_id: sesionId,
      p_productos: this.aPayload(productos),
    });

    if (error) return { error: error.message };
    return { codigo: data as string };
  }

  async obtenerPorCodigo(codigo: string): Promise<CompraConfirmada | null> {
    const { data, error } = await this.supabase.rpc('obtener_compra', { p_codigo: codigo });
    if (error || !data) return null;
    return this.mapCompra(data);
  }

  private mapResumen(row: any): ResumenCompra {
    return {
      pelicula: row.pelicula,
      fechaFuncion: row.fecha_funcion,
      horaInicio: String(row.hora_inicio).slice(0, 5),
      formato: row.formato,
      idioma: row.idioma,
      restriccionEdad: row.restriccion_edad,
      requiereAdulto: row.requiere_adulto,
      items: row.items.map((i: any) => ({
        fila: i.fila,
        columna: i.columna,
        tipo: i.tipo,
        precioUnitario: Number(i.precio_unitario),
        precioFinal: Number(i.precio_final),
        enCombo: !!i.en_combo,
      })),
      productos: (row.productos ?? []).map((p: any) => ({
        productoId: p.producto_id,
        nombre: p.nombre,
        cantidad: Number(p.cantidad),
        precioUnitario: Number(p.precio_unitario),
        subtotal: Number(p.subtotal),
      })),
      totalProductos: Number(row.total_productos ?? 0),
      subtotal: Number(row.subtotal),
      descuentoPorcentaje: Number(row.descuento_porcentaje),
      cupon: row.cupon,
      total: Number(row.total),
      creditoDisponible: Number(row.credito_disponible ?? 0),
      creditoAplicado: Number(row.credito_aplicado ?? 0),
      aPagar: Number(row.a_pagar ?? row.total),
      comboEntradas: Number(row.combo_entradas ?? 0),
    };
  }

  private mapCompra(row: any): CompraConfirmada {
    return {
      codigoQr: row.codigo_qr,
      estado: row.estado,
      fecha: row.fecha,
      total: Number(row.total),
      pelicula: row.pelicula,
      restriccionEdad: row.restriccion_edad,
      requiereAdulto: row.requiere_adulto,
      sala: row.sala,
      fechaFuncion: row.fecha_funcion,
      horaInicio: String(row.hora_inicio).slice(0, 5),
      formato: row.formato,
      idioma: row.idioma,
      entradas: (row.entradas ?? []).map((e: any) => ({
        fila: e.fila,
        columna: e.columna,
        tipo: e.tipo,
        precio: Number(e.precio),
      })),
      productos: (row.productos ?? []).map((p: any) => ({
        nombre: p.nombre,
        cantidad: Number(p.cantidad),
        precioUnitario: Number(p.precio_unitario),
      })),
      candyEntregado: !!row.candy_entregado,
    };
  }
}