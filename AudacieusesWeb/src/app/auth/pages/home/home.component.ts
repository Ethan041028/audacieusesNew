import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { fadeAnimation } from '../../../core/animations/route-animations';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [fadeAnimation],
  standalone: true,
  imports: [RouterLink]
})
export class HomeComponent {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Si l'utilisateur est déjà connecté, rediriger vers son tableau de bord
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnRole();
    }
  }

  private redirectBasedOnRole(): void {
    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.authService.isClient()) {
      this.router.navigate(['/client/dashboard']);
    }
  }
}