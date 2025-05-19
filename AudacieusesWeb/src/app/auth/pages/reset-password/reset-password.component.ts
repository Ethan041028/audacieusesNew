import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { fadeAnimation, formAnimation, alertAnimation } from '../../../core/animations/route-animations';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  animations: [fadeAnimation, formAnimation, alertAnimation],
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgClass, RouterLink]
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  token: string = '';
  loading = false;
  submitted = false;
  successMessage = '';
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetPasswordForm = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Récupérer le token de réinitialisation depuis les paramètres de l'URL
    this.token = this.route.snapshot.queryParams['token'] || '';
    
    if (!this.token) {
      this.error = 'Token de réinitialisation manquant. Veuillez réessayer le processus de récupération de mot de passe.';
    }
  }

  // Validateur personnalisé pour vérifier que les mots de passe correspondent
  passwordMatchValidator(fg: FormGroup) {
    const newPassword = fg.get('newPassword')?.value;
    const confirmPassword = fg.get('confirmPassword')?.value;

    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  // Getter pour faciliter l'accès aux champs du formulaire
  get f() { return this.resetPasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.error = '';

    // Arrêter si le formulaire est invalide
    if (this.resetPasswordForm.invalid) {
      return;
    }

    this.loading = true;

    this.authService.resetPassword(this.token, this.f['newPassword'].value)
      .subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Votre mot de passe a été réinitialisé avec succès.';
          
          // Redirection vers la page de connexion après quelques secondes
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: error => {
          this.error = error.error || 'Une erreur est survenue. Veuillez réessayer.';
          this.loading = false;
        }
      });
  }
}