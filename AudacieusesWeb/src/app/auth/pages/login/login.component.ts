import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgIf, NgClass } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { fadeAnimation, formAnimation, alertAnimation } from '../../../core/animations/route-animations';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: [fadeAnimation, formAnimation, alertAnimation],
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgClass, RouterLink]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  submitted = false;
  returnUrl: string = '/';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    // Rediriger si déjà connecté
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnRole();
    }

    this.loginForm = this.formBuilder.group({
      mail: ['', [Validators.required, Validators.email]],
      mdp: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Récupérer l'URL de retour des paramètres de query ou utiliser la valeur par défaut
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // Getter pour faciliter l'accès aux champs du formulaire
  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    // Arrêter si le formulaire est invalide
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login({
      mail: this.f['mail'].value,
      mdp: this.f['mdp'].value
    }).subscribe({
      next: () => {
        this.redirectBasedOnRole();
      },
      error: error => {
        this.error = error.error || 'Identifiants incorrects';
        this.loading = false;
      }
    });
  }

  private redirectBasedOnRole(): void {
    // Rediriger en fonction du rôle
    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.authService.isClient()) {
      this.router.navigate(['/client/dashboard']);
    } else {
      // Si le rôle est inconnu, rediriger vers la page d'accueil
      this.router.navigate(['/']);
    }
  }
}