import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ModuleService } from '../../../admin/services/module.service';
import { SeanceService } from '../../../services/seance.service';
import { NotificationService } from '../../../services/notification.service';
import { ModuleImageService } from '../../../services/module-image.service';

// Définir les interfaces temporairement ici en attendant que l'import fonctionne
interface Seance {
  id: number;
  titre: string;
  description: string;
  contenu: string;
  duree: number;
  ordre: number;
  type: string;
  statut: string;
  date_creation: string;
  date_modification: string;
  modules?: number[]; // Liste des IDs de modules associés via module_seance
  suivi?: {
    id: number;
    user_id: number;
    seance_id: number;
    statut: string;
    progression: number;
    date_debut: string;
    date_fin: string;
  };
  isUnlocked?: boolean;
}

interface SeancesResponse {
  seances: Seance[];
  total: number;
}

@Component({
  selector: 'app-module-detail',
  templateUrl: './module-detail.component.html',
  styleUrls: ['./module-detail.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ModuleDetailComponent implements OnInit {
  moduleId: number = 0;
  module: any;
  seances: Seance[] = [];
  loading = {
    module: true,
    seances: true
  };
  error: {
    module: string | null,
    seances: string | null
  } = {
    module: null,
    seances: null
  };
  progressPercent = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private moduleService: ModuleService,
    private seanceService: SeanceService,
    private notificationService: NotificationService,
    private moduleImageService: ModuleImageService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.moduleId = +params['id'];
      this.loadModuleDetails();
      this.loadModuleSeances();
    });
  }

  loadModuleDetails(): void {
    this.loading.module = true;
    this.error.module = null;

    this.moduleService.getModuleById(this.moduleId).subscribe({
      next: (data: any) => {
        this.module = data.module;
        console.log(`Détails du module ${this.moduleId}:`, this.module);
        
        // Vérifier si le module a des informations de progression depuis l'API
        if (this.module.progression) {
          console.log(`Module ${this.moduleId} - Progression depuis l'API:`, this.module.progression);
          
          // Utiliser directement le pourcentage de progression
          this.progressPercent = this.module.progression.percentage || 0;
          
          console.log(`Module ${this.moduleId} - Progression: ${this.progressPercent}% (depuis API)`);
        }
        
        this.loading.module = false;
      },
      error: (err: any) => {
        this.error.module = `Erreur lors du chargement du module: ${err.message}`;
        this.loading.module = false;
      }
    });
  }

  loadModuleSeances(): void {
    this.loading.seances = true;
    this.error.seances = null;

    this.seanceService.getSeancesByModule(this.moduleId).subscribe({
      next: (data: SeancesResponse) => {
        // Utiliser directement les séances sans filtrage supplémentaire
        // car l'API renvoie déjà les séances associées au module
        console.log('Données de séances complètes:', data);
        
        this.seances = data.seances.map((seance: Seance) => {
          console.log(`Séance ${seance.id} - Données suivi:`, seance.suivi);
          // Toutes les séances sont toujours débloquées
          return { ...seance, isUnlocked: true };
        });
        
        console.log(`Nombre de séances récupérées pour le module ${this.moduleId}: ${this.seances.length}`);
        console.log('Tableau complet des séances avec suivi:', this.seances);
        
        // Calculer le pourcentage de progression
        const completedSeances = this.seances.filter(s => this.isSeanceCompleted(s)).length;
        
        this.progressPercent = this.seances.length > 0 ? 
          Math.min(Math.round((completedSeances / this.seances.length) * 100), 100) : 0;
        
        console.log(`Module ${this.moduleId}: ${completedSeances}/${this.seances.length} séances terminées (${this.progressPercent}%)`);
        
        this.loading.seances = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des séances:', err);
        this.error.seances = `Erreur lors du chargement des séances: ${err.message}`;
        this.loading.seances = false;
      }
    });
  }

  // Déterminer si une séance est débloquée
  isSeanceUnlocked(seance: any, allSeances: any[]): boolean {
    // Toutes les séances sont toujours débloquées
    return true;
  }

  // Naviguer vers la page de détail d'une séance
  goToSeance(seance: any): void {
    // Navigation directe sans vérification de verrouillage
    this.router.navigate(['/client/seances', seance.id]);
  }

  // Démarrer le module
  startModule(): void {
    // Prendre simplement la première séance du module
    if (this.seances && this.seances.length > 0) {
      this.goToSeance(this.seances[0]);
    }
  }

  // Retourner à la liste des modules
  goBack(): void {
    this.router.navigate(['/client/modules']);
  }

  // Déterminer le statut du module
  getModuleStatus(): string {
    // Vérifier d'abord le statut dans module.progression
    if (this.module && this.module.progression && this.module.progression.status) {
      const statusType = this.module.progression.status;
      if (statusType === 'TERMINE') return 'Terminé';
      if (statusType === 'EN_COURS') return 'En cours';
      if (statusType === 'NON_COMMENCE') return 'Non commencé';
    }
    
    // Sinon, utiliser le pourcentage de progression calculé
    if (this.progressPercent === 100) {
      return 'Terminé';
    } else if (this.progressPercent > 0) {
      return 'En cours';
    } else {
      return 'Non commencé';
    }
  }

  // Obtenir la classe CSS pour le statut
  getStatusClass(): string {
    const status = this.getModuleStatus();
    return status.toLowerCase().replace(' ', '-');
  }

  // Vérifier si une séance est terminée
  isSeanceCompleted(seance: any): boolean {
    return seance.suivi && 
           (seance.suivi.statut === 'TERMINE' || 
            seance.suivi.status_id === 3);
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

