import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, SlicePipe, NgStyle } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ModuleService } from '../../../admin/services/module.service';
import { AssetService } from '../../../services/asset.service';
import { Router } from '@angular/router';
import { ModuleImageService } from '../../../services/module-image.service';

@Component({
  selector: 'app-client-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, NgStyle],
  providers: [DatePipe, SlicePipe]
})
export class ClientDashboardComponent implements OnInit {
  user: any;
  modulesList: any[] = [];
  loading = {
    modules: true
  };
  
  // Statistiques
  stats = {
    completedModules: 0,
    inProgressModules: 0,
    completedSeances: 0,
    totalSeances: 0
  };

  constructor(
    private authService: AuthService,
    private moduleService: ModuleService,
    private router: Router,
    private moduleImageService: ModuleImageService
  ) { }

  ngOnInit(): void {
    this.user = this.authService.currentUserValue.user;
    this.loadUserModules();
  }

  // Charger les modules de l'utilisateur
  loadUserModules(): void {
    this.loading.modules = true;
    this.moduleService.getUserModules(this.user.id).subscribe({
      next: (response) => {
        this.modulesList = response.modules;
        this.calculateModuleStats();
        this.loading.modules = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des modules:', error);
        this.loading.modules = false;
      }
    });
  }

  // Calculer les statistiques des modules
  calculateModuleStats(): void {
    this.stats.completedModules = 0;
    this.stats.inProgressModules = 0;
    this.stats.completedSeances = 0;
    this.stats.totalSeances = 0;

    this.modulesList.forEach(module => {
      // Recalculer le nombre total de séances
      if (module.seances) {
        this.stats.totalSeances += module.seances.length;
        
        // Vérifier si le module a des informations de progression depuis l'API
        if (module.progression) {
          // Si le module a un statut TERMINE, toutes ses séances sont considérées terminées
          if (module.progression.status === 'TERMINE') {
            this.stats.completedSeances += module.seances.length;
            this.stats.completedModules++;
          } 
          // Si le module est en cours, utiliser le nombre de séances terminées fourni par l'API
          else if (module.progression.status === 'EN_COURS') {
            const completedSeances = module.progression.completed || 0;
            this.stats.completedSeances += completedSeances;
            this.stats.inProgressModules++;
          }
        } 
        // Sinon, on compte les séances terminées comme avant
        else {
          const completedSeances = module.seances.filter(
            (seance: any) => this.isSeanceCompleted(seance)
          ).length;
          
          this.stats.completedSeances += completedSeances;
          
          if (completedSeances === module.seances.length && completedSeances > 0) {
            this.stats.completedModules++;
          } else if (completedSeances > 0) {
            this.stats.inProgressModules++;
          }
        }
      }
    });
  }

  // Vérifier si une séance est terminée
  isSeanceCompleted(seance: any): boolean {
    return seance.suivi && 
           (seance.suivi.statut === 'TERMINE' || 
            seance.suivi.status_id === 3);
  }

  // Vérifier si un module est terminé
  isModuleCompleted(module: any): boolean {
    // Vérifier d'abord si on a des informations de progression depuis l'API
    if (module.progression && module.progression.status === 'TERMINE') {
      return true;
    }
    
    // Sinon, vérifier si toutes les séances sont terminées
    if (!module.seances || module.seances.length === 0) {
      return false;
    }
    
    return module.seances.every((s: any) => this.isSeanceCompleted(s)) && module.seances.length > 0;
  }

  // Naviguer vers la page des modules
  goToModules(): void {
    this.router.navigate(['/client/modules']);
  }

  // Obtenir le pourcentage de progression
  getProgressPercentage(): number {
    if (this.stats.totalSeances === 0) return 0;
    
    // Calculer la progression globale en utilisant les données de progression de l'API
    const totalProgress = this.modulesList.reduce((sum, module) => {
      if (module.progression && module.progression.percentage !== undefined) {
        return sum + module.progression.percentage;
      }
      return sum;
    }, 0);
    
    return Math.round(totalProgress / this.modulesList.length);
  }

  // Calculer la largeur de la barre de progression pour un module
  getModuleProgressWidth(module: any): string {
    if (!module.seances || !module.seances.length) {
      return '0%';
    }
    
    // Utiliser directement la progression depuis l'API si disponible
    if (module.progression && module.progression.percentage !== undefined) {
      const percentage = Math.min(module.progression.percentage, 100);
      return `${percentage}%`;
    }
    
    // Sinon, calculer à partir des séances terminées
    const completedSeances = module.seances.filter(
      (s: any) => this.isSeanceCompleted(s)
    ).length;
    
    const percentage = Math.min((completedSeances / module.seances.length * 100), 100);
    return `${percentage}%`;
  }

  /**
   * Retourne l'URL complète de l'image du module
   * @param imagePath Chemin de l'image relatif
   * @returns URL complète de l'image
   */
  getModuleImageFullUrl(imagePath: string | null | undefined): string {
    return this.moduleImageService.getModuleImageUrl(imagePath);
  }
}
