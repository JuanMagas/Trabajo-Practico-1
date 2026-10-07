import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-perfil-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './perfil-layout.html',
  styleUrl: './perfil-layout.css',
})
export class PerfilLayout {
  secciones = [
    { ruta: '/perfil/entradas', texto: 'Mis entradas' },
    { ruta: '/perfil/peliculas', texto: 'Mis películas' },
    { ruta: '/perfil/puntos', texto: 'Mis puntos' },
    { ruta: '/perfil/resenas', texto: 'Mis reseñas' },
  ];
}