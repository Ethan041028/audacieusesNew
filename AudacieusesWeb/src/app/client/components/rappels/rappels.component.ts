import { Component, OnInit, Input } from '@angular/core';
import { EvenementService } from '../../../services/evenement.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-rappels',
  templateUrl: './rappels.component.html',
  styleUrls: ['./rappels.component.scss']
})
export class RappelsComponent implements OnInit {
  @Input() maxItems: number = 5;
  @Input() showAll: boolean = false; // Si true, affiche tous les rappels, sinon uniquement ceux de l'utilisateur
  
  currentUser: any;
  rappels: any[] = [];
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private evenementService: EvenementService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue.user;
    this.loadRappels();
  }

  loadRappels(): void {
    this.loading = true;
    this.error = null;
    
    if (this.showAll) {
      // Pour les administrateurs, récupérer tous les rappels
      this.evenementService.getAllRappels().subscribe({
        next: (response) => {
          this.rappels = response.evenements;
          this.loading = false;
        },
        error: (error) => {
          this.error = `Erreur lors du chargement des rappels: ${error.error}`;
          this.loading = false;
        }
      });
    } else {
      // Pour les clients, récupérer uniquement leurs rappels
      this.evenementService.getUserRappels().subscribe({
        next: (response) => {
          this.rappels = response.evenements;
          this.loading = false;
        },
        error: (error) => {
          this.error = `Erreur lors du chargement des rappels: ${error.error}`;
          this.loading = false;
        }
      });
    }
  }

  // Calculer le temps restant avant l'événement
  getTempsRestant(dateDebut: string): string {
    const maintenant = new Date();
    const dateEvenement = new Date(dateDebut);
    const difference = dateEvenement.getTime() - maintenant.getTime();
    
    // Si la date est passée
    if (difference < 0) {
      return 'Événement passé';
    }
    
    // Calculer jours, heures, minutes
    const jours = Math.floor(difference / (1000 * 60 * 60 * 24));
    const heures = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    
    if (jours > 0) {
      return `${jours} jour${jours > 1 ? 's' : ''} ${heures}h`;
    } else if (heures > 0) {
      return `${heures}h ${minutes}min`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
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

  // Obtenir la classe CSS en fonction du temps restant
  getUrgenceClass(dateDebut: string): string {
    const maintenant = new Date();
    const dateEvenement = new Date(dateDebut);
    const difference = dateEvenement.getTime() - maintenant.getTime();
    
    const heures = difference / (1000 * 60 * 60);
    
    if (heures < 24) {
      return 'urgence-haute';
    } else if (heures < 72) {
      return 'urgence-moyenne';
    } else {
      return 'urgence-basse';
    }
  }
}

