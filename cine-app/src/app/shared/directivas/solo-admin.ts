import { Directive, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth';

// Uso: <a *appSoloAdmin routerLink="/admin/dashboard">Admin</a>
// Es solo de interfaz: la seguridad real la ponen las RLS y los guards.
@Directive({ selector: '[appSoloAdmin]' })
export class SoloAdmin {
  private plantilla = inject(TemplateRef<unknown>);
  private contenedor = inject(ViewContainerRef);
  private auth = inject(AuthService);
  private visible = false;

  constructor() {
    effect(() => {
      const esAdmin = this.auth.perfil()?.rol === 'admin';
      if (esAdmin && !this.visible) {
        this.contenedor.createEmbeddedView(this.plantilla);
        this.visible = true;
      } else if (!esAdmin && this.visible) {
        this.contenedor.clear();
        this.visible = false;
      }
    });
  }
}