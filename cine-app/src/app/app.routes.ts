import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';
import { empleadoGuard } from './core/guards/empleado-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/peliculas/listado/listado').then(m => m.Listado),
  },
  {
    path: 'pelicula/:id',
    loadComponent: () => import('./features/peliculas/detalle/detalle').then(m => m.Detalle),
  },
  {
    path: 'proximamente',
    loadComponent: () => import('./features/peliculas/proximamente/proximamente').then(m => m.Proximamente),
  },

  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
  },

  {
    path: 'compra/:funcionId',
    children: [
      {
        path: 'butacas',
        loadComponent: () => import('./features/compra/seleccion-butacas/seleccion-butacas').then(m => m.SeleccionButacas),
      },
      {
        path: 'candy',
        loadComponent: () => import('./features/compra/candy-bar/candy-bar').then(m => m.CandyBar),
      },
      {
        path: 'checkout',
        loadComponent: () => import('./features/compra/checkout/checkout').then(m => m.Checkout),
      },
      {
        path: 'confirmacion',
        loadComponent: () => import('./features/compra/confirmacion/confirmacion').then(m => m.Confirmacion),
      },
    ],
  },

  {
    path: 'perfil',
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/perfil/perfil-layout/perfil-layout').then(m => m.PerfilLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'entradas' },
      { path: 'entradas', loadComponent: () => import('./features/perfil/mis-entradas/mis-entradas').then(m => m.MisEntradas) },
      { path: 'peliculas', loadComponent: () => import('./features/perfil/mis-peliculas/mis-peliculas').then(m => m.MisPeliculas) },
      { path: 'puntos', loadComponent: () => import('./features/perfil/mis-puntos/mis-puntos').then(m => m.MisPuntos) },
      { path: 'resenas', loadComponent: () => import('./features/perfil/mis-resenas/mis-resenas').then(m => m.MisResenas) },
    ],
  },

  {
    path: 'empleado/validar',
    canActivate: [empleadoGuard],
    loadComponent: () => import('./features/empleado/validar-qr/validar-qr').then(m => m.ValidarQr),
  },

  {
    path: 'admin',
    canActivateChild: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.Dashboard) },
      {
        // Todo lo que cuelga de acá muestra el botón "Volver al panel"
        path: '',
        loadComponent: () => import('./features/admin/admin-layout/admin-layout').then(m => m.AdminLayout),
        children: [
          { path: 'peliculas', loadComponent: () => import('./features/admin/peliculas-admin/peliculas-admin').then(m => m.PeliculasAdmin) },
          { path: 'salas-funciones', loadComponent: () => import('./features/admin/salas-funciones/salas-funciones').then(m => m.SalasFunciones) },
          { path: 'productos', loadComponent: () => import('./features/admin/productos-admin/productos-admin').then(m => m.ProductosAdmin) },
          { path: 'recompensas', loadComponent: () => import('./features/admin/recompensas-admin/recompensas-admin').then(m => m.RecompensasAdmin) },
          { path: 'cupones', loadComponent: () => import('./features/admin/cupones-admin/cupones-admin').then(m => m.CuponesAdmin) },
          { path: 'combos', loadComponent: () => import('./features/admin/combos-admin/combos-admin').then(m => m.CombosAdmin) },
          { path: 'reportes', loadComponent: () => import('./features/admin/reportes/reportes').then(m => m.Reportes) },
          { path: 'log', loadComponent: () => import('./features/admin/log-actividad-admin/log-actividad-admin').then(m => m.LogActividadAdmin) },
        ],
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./features/no-encontrada/no-encontrada').then(m => m.NoEncontrada),
  },
];