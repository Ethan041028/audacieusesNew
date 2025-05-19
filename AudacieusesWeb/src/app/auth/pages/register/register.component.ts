import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { fadeAnimation, formAnimation, alertAnimation } from '../../../core/animations/route-animations';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  animations: [fadeAnimation, formAnimation, alertAnimation],
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgClass, RouterLink]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // Rediriger si déjà connecté
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnRole();
    }

    this.registerForm = this.formBuilder.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      mail: ['', [Validators.required, Validators.email]],
      mdp: ['', [Validators.required, Validators.minLength(8)]],
      mdpConfirm: ['', Validators.required],
      date_naissance: [''],
      acceptTerms: [false, Validators.requiredTrue]
    }, {
      validator: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Initialisation supplémentaire si nécessaire
  }

  // Validateur personnalisé pour vérifier que les mots de passe correspondent
  passwordMatchValidator(fg: FormGroup) {
    const mdp = fg.get('mdp')?.value;
    const mdpConfirm = fg.get('mdpConfirm')?.value;

    return mdp === mdpConfirm ? null : { mismatch: true };
  }

  // Getter pour faciliter l'accès aux champs du formulaire
  get f() { return this.registerForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    // Arrêter si le formulaire est invalide
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    // Extraire les données du formulaire et supprimer les champs inutiles
    const userData = {
      prenom: this.f['prenom'].value,
      nom: this.f['nom'].value,
      mail: this.f['mail'].value,
      mdp: this.f['mdp'].value,
      date_naissance: this.f['date_naissance'].value
    };

    this.authService.register(userData).subscribe({
      next: () => {
        // Inscription réussie, rediriger vers le tableau de bord approprié
        this.redirectBasedOnRole();
      },
      error: error => {
        console.log('Erreur d\'inscription détaillée:', error);
        this.error = error.error?.message || error.error || 'Une erreur est survenue lors de l\'inscription';
        this.loading = false;
      }
    });
  }

  private redirectBasedOnRole(): void {
    // Rediriger en fonction du rôle
    console.log('Redirection basée sur le rôle, utilisateur connecté?', this.authService.isLoggedIn());
    
    if (this.authService.isAdmin()) {
      console.log('Redirection vers le tableau de bord admin');
      this.router.navigate(['/admin/dashboard']);
    } else if (this.authService.isClient()) {
      console.log('Redirection vers le tableau de bord client');
      this.router.navigate(['/client/dashboard']);
    } else {
      // Si le rôle est inconnu ou non détecté, rediriger vers la page d'accueil
      console.log('Rôle non détecté, redirection vers la page d\'accueil');
      this.router.navigate(['/']);
    }
  }
}