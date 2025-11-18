import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminUserService } from '../../../services/useradmin-service';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css'
})
export class LoginForm {
  form: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private adminUserService: AdminUserService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  get emailCtrl() {
    return this.form.get('email');
  }

  get passwordCtrl() {
    return this.form.get('password');
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    const { email, password } = this.form.value;

    this.adminUserService.login({ email, password }).subscribe({
      next: (res) => {
        // Guarda token sencillo para el admin panel
        localStorage.setItem('admin_token', res.token);
        localStorage.setItem('admin_user', JSON.stringify(res.user));

        this.loading = false;

        // Si venía redirectTo desde el guard, vuelve ahí
        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
        if (redirectTo) {
          this.router.navigateByUrl(redirectTo);
        } else {
          // Ruta por defecto al iniciar sesión
          this.router.navigate(['/admin-panel']);
        }
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Error al iniciar sesión. Revisa tus datos.';
      }
    });
  }
}
