import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModuleService } from '../../../admin/services/module.service';
import { AuthService } from '../../../services/auth.service';
import { ModuleImageService } from '../../../services/module-image.service';

@Component({
  selector: 'app-modules-list',
  templateUrl: './modules-list.component.html',
  styleUrls: ['./modules-list.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ModulesListComponent implements OnInit {
  modules: any[] = [];
  filteredModules: any[] = [];
  filterOptions = {
    niveau: 'tous',
    statut: 'tous',
    searchText: ''
  };
  loading = true;
  error: string | null = null;
  
  niveauxModules = ['Débutant', 'Intermédiaire', 'Avancé'];
  statutsModules = ['En cours', 'Terminé', 'Non commencé'];

  constructor(
    private moduleService: ModuleService,
    private router: Router,
    private authService: AuthService,
    private moduleImageService: ModuleImageService
  ) { }

  ngOnInit(): void {
    this.loadModules();
  }

  loadModules(): void {
    this.loading = true;
    this.error = null;
    
    const userId = this.authService.currentUserValue.user.id;
    this.moduleService.getUserModules(userId).subscribe({
      next: (data) => {
        this.modules = data.modules.map((module: any) => {
          console.log(`Module ${module.id} - Informations complètes:`, module);
          
          let progressPercent = 0;
          let statut = 'Non commencé';
          
          // Vérifier si le module a des informations de progression depuis l'API
          if (module.progression) {
            console.log(`Module ${module.id} - Progression depuis l'API:`, module.progression);
            
            // Utiliser directement le pourcentage de l'API
            progressPercent = module.progression.percentage || 0;
            
            // Déterminer le statut du module à partir du statut dans module.progression
            if (module.progression.status === 'TERMINE') {
              statut = 'Terminé';
              console.log(`Module ${module.id} - Statut TERMINE selon API`);
            } else if (module.progression.status === 'EN_COURS') {
              statut = 'En cours';
              console.log(`Module ${module.id} - Statut EN COURS selon API`);
            } else {
              console.log(`Module ${module.id} - Statut par défaut selon API: ${module.progression.status}`);
            }
          } else {
            // Calcul du pourcentage de progression basé sur les séances
            const totalSeances = module.seances ? module.seances.length : 0;
            const completedSeances = this.getCompletedSeancesCount(module);
            
            progressPercent = totalSeances > 0 ? Math.round((completedSeances / totalSeances) * 100) : 0;
            
            // Déterminer le statut du module
            if (this.isModuleCompleted(module)) {
              statut = 'Terminé';
              console.log(`Module ${module.id} - Statut TERMINE (toutes les séances sont terminées)`);
            } else if (completedSeances > 0) {
              statut = 'En cours';
              console.log(`Module ${module.id} - Statut EN COURS (${completedSeances}/${totalSeances} séances terminées)`);
            } else {
              console.log(`Module ${module.id} - Statut NON COMMENCE (aucune séance terminée)`);
            }
          }
          
          console.log(`Module ${module.id} - Résultat final: statut=${statut}, progression=${progressPercent}%`);
          
          return {
            ...module,
            progressPercent,
            statut
          };
        });
        
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = `Erreur lors du chargement des modules: ${err.message}`;
        this.loading = false;
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

  // Fonction pour obtenir le nombre de séances terminées
  getCompletedSeancesCount(module: any): number {
    if (!module.seances) return 0;
    
    // Vérifier si on a des informations de progression depuis l'API
    if (module.progression && module.progression.completed !== undefined) {
      return module.progression.completed;
    }
    
    // Sinon, compter les séances terminées
    return module.seances.filter((s: any) => this.isSeanceCompleted(s)).length;
  }

  applyFilters(): void {
    this.filteredModules = this.modules.filter(module => {
      // Filtre par niveau
      if (this.filterOptions.niveau !== 'tous' && module.niveau !== this.filterOptions.niveau) {
        return false;
      }
      
      // Filtre par statut
      if (this.filterOptions.statut !== 'tous' && module.statut !== this.filterOptions.statut) {
        return false;
      }
      
      // Filtre par texte
      if (this.filterOptions.searchText) {
        const searchText = this.filterOptions.searchText.toLowerCase();
        return module.titre.toLowerCase().includes(searchText) || 
               module.description.toLowerCase().includes(searchText);
      }
      
      return true;
    });
  }

  viewModuleDetails(moduleId: number): void {
    this.router.navigate(['/client/modules', moduleId]);
  }

  resetFilters(): void {
    this.filterOptions = {
      niveau: 'tous',
      statut: 'tous',
      searchText: ''
    };
    this.applyFilters();
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