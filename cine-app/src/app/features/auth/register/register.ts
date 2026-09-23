import { Component, signal, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { form, FormField, required, email as emailValidator, minLength } from '@angular/forms/signals';
import { AuthService } from '../../../core/services/auth';
import { TipoSangre } from '../../../models/usuario';

interface RegisterForm {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  fechaNacimiento: string;
  tipoSangre: TipoSangre;
  colorOjos: string;
  diasVacaciones: number;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormField, NgIf],
  templateUrl: './register.html',
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  errorMsg = signal<string | null>(null);

  model = signal<RegisterForm>({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    fechaNacimiento: '',
    tipoSangre: 'O+',
    colorOjos: '',
    diasVacaciones: 0,
  });

  registerForm = form(this.model, (path) => {
    required(path.nombre, { message: 'El nombre es obligatorio' });
    required(path.apellido, { message: 'El apellido es obligatorio' });
    required(path.email, { message: 'El email es obligatorio' });
    emailValidator(path.email, { message: 'Ingresá un email válido' });
    required(path.password, { message: 'La contraseña es obligatoria' });
    minLength(path.password, 6, { message: 'Mínimo 6 caracteres' });
    required(path.fechaNacimiento, { message: 'La fecha de nacimiento es obligatoria' });
  });

  async enviar() {
    if (!this.registerForm().valid()) return;

    this.cargando.set(true);
    this.errorMsg.set(null);

    const { email, password, ...datosPerfil } = this.model();
    const { error } = await this.authService.signUp(email, password, datosPerfil);

    this.cargando.set(false);

    if (error) {
      this.errorMsg.set(error.message ?? 'No se pudo completar el registro');
      return;
    }

    this.router.navigate(['/']);
  }
}