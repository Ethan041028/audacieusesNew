import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvenementService } from '../../../services/evenement.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-client-rappels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rappels.component.html',
  styleUrls: ['./rappels.component.scss']
})
export class RappelsComponent implements OnInit, OnDestroy {
  rappels: any[] = [];
  loading = false;
  error: string | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private evenementService: EvenementService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadRappels();
  }

  ngOnDestroy(): void {
    // Désabonnement de toutes les souscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadRappels(): void {
    this.loading = true;
    this.error = null;

    const sub = this.evenementService.getUserRappels().subscribe({
      next: (rappels) => {
        this.rappels = rappels;
        this.loading = false;
      },
      error: (error) => {
        this.error = `Erreur lors du chargement des rappels: ${error.message || 'Erreur inconnue'}`;
        this.loading = false;
      }
    });

    this.subscriptions.push(sub);
  }

  // Calculer le temps restant avant l'événement
  getTempsRestant(dateDebut: string, tempsRappel: number): string {
    const now = new Date();
    const eventDate = new Date(dateDebut);
    const diff = eventDate.getTime() - now.getTime();
    
    // Si l'événement est passé
    if (diff <= 0) {
      return 'Événement passé';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let result = '';
    
    if (days > 0) {
      result += `${days} jour${days > 1 ? 's' : ''} `;
    }
    
    if (hours > 0 || days > 0) {
      result += `${hours} heure${hours > 1 ? 's' : ''} `;
    }
    
    result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
    
    return result;
  }

  // Formater la date pour l'affichage
  formatDate(date: string): string {
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obtenir la classe CSS selon le type d'événement
  getEventClass(type: string): string {
    switch (type) {
      case 'rendez-vous':
        return 'bg-purple';
      case 'rappel':
        return 'bg-warning';
      case 'seance':
        return 'bg-teal';
      default:
        return 'bg-primary';
    }
  }

  // Recharger les rappels
  rafraichir(): void {
    this.loadRappels();
  }
}