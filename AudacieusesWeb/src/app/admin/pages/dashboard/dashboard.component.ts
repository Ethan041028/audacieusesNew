import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http'; 
import { RouterLink } from '@angular/router';
import { AdminService, DashboardStats } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterLink]
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalModules: 0,
    totalSeances: 0,
    recentActivity: []
  };
  loading = true;
  error: string | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadDashboardStats();
  }
  
  loadDashboardStats(): void {
    this.loading = true;
    this.error = null;

    this.adminService.getDashboardStats().subscribe({
      next: (data) => {
        // S'assurer que toutes les propriétés requises existent
        this.stats = {
          totalUsers: data.totalUsers || 0,
          activeUsers: data.activeUsers || 0,
          totalModules: data.totalModules || 0,
          totalSeances: data.totalSeances || 0,
          recentActivity: data.recentActivity || []
        };
        this.loading = false;
      },
      error: (err) => {
        this.error = `Erreur lors du chargement des statistiques: ${err.message || 'Erreur inconnue'}`;
        this.loading = false;
      }
    });
  }
    /**
   * Formate une date pour l'affichage
   * @param dateString La date à formater
   * @returns Date formatée en français
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Date inconnue';
    
    const date = new Date(dateString);
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    // Date d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Date d'hier
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Comparaison des dates
    const dateWithoutTime = new Date(date);
    dateWithoutTime.setHours(0, 0, 0, 0);
    
    if (dateWithoutTime.getTime() === today.getTime()) {
      // Formatage de l'heure pour aujourd'hui
      return `Aujourd'hui à ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (dateWithoutTime.getTime() === yesterday.getTime()) {
      // Formatage de l'heure pour hier
      return `Hier à ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      // Options pour le formatage de la date
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      return new Intl.DateTimeFormat('fr-FR', options).format(date);
    }
  }
}
