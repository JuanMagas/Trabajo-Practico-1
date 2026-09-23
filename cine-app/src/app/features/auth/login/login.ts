import { Component, signal, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { form, FormField, required, email as emailValidator } from '@angular/forms/signals';
import { AuthService } from '../../../core/services/auth';

interface LoginForm {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormField, NgIf],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  errorMsg = signal<string | null>(null);

  model = signal<LoginForm>({ email: '', password: '' });

  loginForm = form(this.model, (path) => {
    required(path.email, { message: 'El email es obligatorio' });
    emailValidator(path.email, { message: 'Ingresá un email válido' });
    required(path.password, { message: 'La contraseña es obligatoria' });
  });

  async enviar() {
    if (!this.loginForm().valid()) return;

    this.cargando.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.model();
    const { error } = await this.authService.signIn(email, password);

    this.cargando.set(false);

    if (error) {
      this.errorMsg.set('Email o contraseña incorrectos');
      return;
    }

    this.router.navigate(['/']);
  }
}