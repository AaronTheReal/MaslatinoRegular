import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { AdminUser, AdminRole } from '../panel-usuarios'; // ajusta path si hace falta

@Component({
  selector: 'app-admin-usuario-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-usuario-form.html',
  styleUrl: './admin-usuario-form.css'
})
export class AdminUsuarioFormComponent implements OnChanges {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() usuario: AdminUser | null = null;
  @Input() saving = false;

  @Output() submit = new EventEmitter<{
    mode: 'create' | 'edit';
    id?: string;
    data: any;
  }>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;

  roles: AdminRole[] = ['Periodista', 'Escritor', 'Administrador', 'Tecnico'];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['Escritor', [Validators.required]],
      password: [''],
      isActive: [true]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuario'] || changes['mode']) {
      this.patchForm();
    }
  }

  private patchForm(): void {
    if (this.mode === 'edit' && this.usuario) {
      this.form.patchValue({
        name: this.usuario.name || '',
        email: this.usuario.email || '',
        role: this.usuario.role || 'Escritor',
        password: '',
        isActive: this.usuario.isActive !== false
      });
    } else {
      this.form.reset({
        name: '',
        email: '',
        role: 'Escritor',
        password: '',
        isActive: true
      });
    }
  }

  get titulo(): string {
    return this.mode === 'create' ? 'Crear usuario' : 'Editar usuario';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;

    const data: any = {
      name: raw.name,
      email: raw.email,
      role: raw.role,
      isActive: raw.isActive
    };

    // Sólo incluir password si tiene algo (en editar es opcional)
    if (raw.password && raw.password.trim().length > 0) {
      data.password = raw.password.trim();
    }

    this.submit.emit({
      mode: this.mode,
      id: this.usuario?._id,
      data
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  hasError(controlName: string, error: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }
}
