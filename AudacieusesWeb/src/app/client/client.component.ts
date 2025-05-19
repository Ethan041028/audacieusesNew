import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './client.component.html',
  styleUrl: './client.component.scss'
})
export class ClientComponent {
  currentUser: any;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Récupérer les informations de l'utilisateur connecté
    this.currentUser = this.authService.currentUserValue?.user || { prenom: 'Utilisateur', nom: '' };
  }

  // Méthode pour gérer la déconnexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
