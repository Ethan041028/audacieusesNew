import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  currentUser: any;

  constructor(private authService: AuthService) {
    // Récupérer les informations de l'utilisateur connecté
    this.currentUser = this.authService.currentUserValue?.user || { prenom: 'Admin', nom: '' };
  }

  logout(): void {
    this.authService.logout();
    // Le service de déconnexion s'occupe déjà de rediriger vers la page de connexion
  }
}
