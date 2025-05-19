import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { fadeAnimation, formAnimation, alertAnimation } from '../../../core/animations/route-animations';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  animations: [fadeAnimation, formAnimation, alertAnimation],
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgClass, RouterLink]
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  loading = false;
  submitted = false;
  successMessage = '';
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      mail: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Si l'utilisateur est déjà connecté, le rediriger
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  // Getter pour faciliter l'accès aux champs du formulaire
  get f() { return this.forgotPasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.error = '';

    // Arrêter si le formulaire est invalide
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.loading = true;

    this.authService.forgotPassword(this.f['mail'].value)
      .subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Un email a été envoyé à votre adresse avec les instructions pour réinitialiser votre mot de passe.';
          // Optionnel : redirection après quelques secondes
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 5000);
        },
        error: error => {
          this.error = error.error || 'Une erreur est survenue. Veuillez réessayer.';
          this.loading = false;
        }
      });
  }
}