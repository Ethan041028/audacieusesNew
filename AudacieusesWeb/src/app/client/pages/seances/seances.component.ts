import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SeanceService, Seance } from '../../../services/seance.service';

@Component({
  selector: 'app-seances',
  templateUrl: './seances.component.html',
  styleUrls: ['./seances.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule]
})
export class SeancesComponent implements OnInit {
  seances: Seance[] = [];
  loading = true;
  error: string | null = null;
  userId: number | null = null;
  filter = 'all'; // 'all', 'pending', 'completed'

  constructor(
    private seanceService: SeanceService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.userId = this.authService.currentUserValue?.user?.id || null;
    if (this.userId) {
      this.loadUserSeances();
    } else {
      this.error = "Impossible d'identifier l'utilisateur connecté";
      this.loading = false;
    }
  }

  loadUserSeances() {
    this.loading = true;
    this.error = null;
    
    if (!this.userId) {
      this.error = "Aucun utilisateur connecté";
      this.loading = false;
      return;
    }
    
    // Pour l'instant, nous récupérons toutes les séances et filtrons côté client
    // Dans une implémentation complète, nous pourrions ajouter un endpoint API spécifique
    this.seanceService.getAllSeances().subscribe({
      next: (response) => {
        this.seances = response.seances || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des séances', err);
        this.error = 'Impossible de charger vos séances. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }

  // Filtrer les séances
  filterSeances(filter: string) {
    this.filter = filter;
  }

  getFilteredSeances() {
    if (this.filter === 'all') {
      return this.seances;
    }
    return this.seances.filter(seance => {
      if (this.filter === 'completed') {
        return seance.suivi?.statut === 'TERMINE';
      } else if (this.filter === 'pending') {
        return seance.suivi?.statut !== 'TERMINE';
      }
      return true;
    });
  }
}
