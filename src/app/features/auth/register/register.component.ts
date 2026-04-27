import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

const pastDateValidator: ValidatorFn = (ctrl: AbstractControl) => {
  if (!ctrl.value) return null;
  return new Date(ctrl.value) < new Date() ? null : { futureDate: true };
};

const passwordMatchValidator: ValidatorFn = (group: AbstractControl) => {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass === confirm ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group(
    {
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      date_of_birth: ['', [Validators.required, pastDateValidator]],
      gender: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly serverError = signal('');

  get fullName() { return this.form.get('full_name')!; }
  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }
  get dateOfBirth() { return this.form.get('date_of_birth')!; }
  get gender() { return this.form.get('gender')!; }
  readonly today = new Date().toISOString().split('T')[0];

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.serverError.set('');

    const { full_name, email, password, date_of_birth, gender } = this.form.getRawValue();
    this.auth.register({ full_name: full_name!, email: email!, password: password!, date_of_birth: date_of_birth!, gender: gender! }).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.email.setErrors({ emailTaken: true });
        } else {
          this.serverError.set('Something went wrong. Please try again.');
        }
      },
    });
  }
}
