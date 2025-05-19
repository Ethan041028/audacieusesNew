import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { ModuleService } from '../../services/module.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-user-modules',
  templateUrl: './user-modules.component.html',
  styleUrls: ['./user-modules.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule]
})
export class UserModulesComponent implements OnInit {
  userId: number = 0;
  user: any = null;
  
  // Listes de modules
  userModules: any[] = [];
  availableModules: any[] = [];
  allModules: any[] = [];
  
  // États de chargement
  loading = {
    user: true,
    modules: true
  };
  
  // Gestion des erreurs
  error = {
    user: null as string | null,
    modules: null as string | null
  };
  
  // Filtres et tri
  searchQuery: string = '';
  sortConfig = {
    userModules: { field: 'date_assignation', order: 'desc' as 'asc' | 'desc' },
    availableModules: { field: 'titre', order: 'asc' as 'asc' | 'desc' }
  };
  
  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private moduleService: ModuleService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    // Récupérer l'ID de l'utilisateur depuis l'URL
    this.route.params.subscribe(params => {
      this.userId = +params['id']; // Convertir en nombre
      this.loadUserDetails();
      this.loadUserModules();
      this.loadAllModules();
    });
  }
  
  loadUserDetails(): void {
    this.loading.user = true;
    this.error.user = null;
    
    this.userService.getUserById(this.userId).subscribe({
      next: (response) => {
        this.user = response.user;
        this.loading.user = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des détails de l\'utilisateur', err);
        this.error.user = 'Impossible de charger les détails de l\'utilisateur. Veuillez réessayer.';
        this.loading.user = false;
      }
    });
  }
  
  loadUserModules(): void {
    this.loading.modules = true;
    this.error.modules = null;
    
    this.userService.getUserModules(this.userId).subscribe({
      next: (response) => {
        this.userModules = response.modules || [];
        this.updateAvailableModules();
        this.loading.modules = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des modules de l\'utilisateur', err);
        this.error.modules = 'Impossible de charger les modules de l\'utilisateur. Veuillez réessayer.';
        this.loading.modules = false;
      }
    });
  }
  
  loadAllModules(): void {
    this.moduleService.getAllModules().subscribe({
      next: (response) => {
        this.allModules = response.modules || [];
        this.updateAvailableModules();
      },
      error: (err) => {
        console.error('Erreur lors du chargement de tous les modules', err);
      }
    });
  }
  
  updateAvailableModules(): void {
    // Mise à jour des modules disponibles (ceux qui ne sont pas encore assignés à l'utilisateur)
    if (this.allModules.length > 0 && this.userModules.length >= 0) {
      const userModuleIds = this.userModules.map(m => m.id);
      this.availableModules = this.allModules.filter(m => !userModuleIds.includes(m.id));
    }
  }
  
  assignModule(moduleId: number): void {
    this.moduleService.assignModuleToUser(moduleId, this.userId).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Module assigné avec succès!');
        this.loadUserModules(); // Recharger la liste des modules de l'utilisateur
      },
      error: (err) => {
        console.error('Erreur lors de l\'assignation du module', err);
        this.notificationService.showError('Impossible d\'assigner le module. Veuillez réessayer.');
      }
    });
  }
  
  removeModule(moduleId: number): void {
    if (confirm('Êtes-vous sûr de vouloir retirer ce module de l\'utilisateur ?')) {
      this.moduleService.removeModuleFromUser(moduleId, this.userId).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('Module retiré avec succès!');
          this.loadUserModules(); // Recharger la liste des modules de l'utilisateur
        },
        error: (err) => {
          console.error('Erreur lors du retrait du module', err);
          this.notificationService.showError('Impossible de retirer le module. Veuillez réessayer.');
        }
      });
    }
  }
  
  resetModuleProgress(moduleId: number): void {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser la progression de ce module ? Cette action est irréversible.')) {
      this.moduleService.resetUserModuleProgress(moduleId, this.userId).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('Progression réinitialisée avec succès!');
          this.loadUserModules(); // Recharger la liste des modules de l'utilisateur
        },
        error: (err) => {
          console.error('Erreur lors de la réinitialisation de la progression', err);
          this.notificationService.showError('Impossible de réinitialiser la progression. Veuillez réessayer.');
        }
      });
    }
  }
  
  // Méthode pour trier les modules
  sortModules(field: string, order: 'asc' | 'desc', moduleType: 'userModules' | 'available' = 'userModules'): void {
    if (moduleType === 'userModules') {
      this.sortConfig.userModules = { field, order };
    } else {
      this.sortConfig.availableModules = { field, order };
    }
    
    // Un message de notification pour indiquer le tri
    const orderLabel = order === 'asc' ? 'croissant' : 'décroissant';
    const fieldLabel = this.getFieldLabel(field);
    this.notificationService.showInfo(`Tri ${orderLabel} par ${fieldLabel} appliqué`);
  }
  
  // Obtenir un libellé lisible pour le champ de tri
  private getFieldLabel(field: string): string {
    switch (field) {
      case 'titre': return 'titre';
      case 'progression': return 'progression';
      case 'date_assignation': return 'date d\'assignation';
      default: return field;
    }
  }
  
  // Méthode pour filtrer et trier les modules
  filterAndSortModules(modules: any[], moduleType: 'userModules' | 'available' = 'userModules'): any[] {
    // D'abord, filtrer les modules
    let filteredModules = this.filterModules(modules);
    
    // Ensuite, trier les modules selon la configuration
    const config = moduleType === 'userModules' ? this.sortConfig.userModules : this.sortConfig.availableModules;
    
    return filteredModules.sort((a, b) => {
      let valueA = a[config.field];
      let valueB = b[config.field];
      
      // Gestion des valeurs nulles/undefined
      if (valueA === null || valueA === undefined) valueA = config.order === 'asc' ? '' : Infinity;
      if (valueB === null || valueB === undefined) valueB = config.order === 'asc' ? '' : Infinity;
      
      // Gestion des dates
      if (config.field === 'date_assignation' && valueA && valueB) {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }
      
      // Tri numérique pour la progression
      if (config.field === 'progression') {
        valueA = Number(valueA) || 0;
        valueB = Number(valueB) || 0;
      }
      
      // Tri alphabétique pour les chaînes
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return config.order === 'asc' 
          ? valueA.localeCompare(valueB, 'fr', { sensitivity: 'base' })
          : valueB.localeCompare(valueA, 'fr', { sensitivity: 'base' });
      }
      
      // Tri numérique
      return config.order === 'asc' ? valueA - valueB : valueB - valueA;
    });
  }
  
  // Filtrer les modules par la recherche
  filterModules(modules: any[]): any[] {
    if (!this.searchQuery.trim()) return modules;
    
    const query = this.searchQuery.toLowerCase().trim();
    return modules.filter(module => 
      module.titre.toLowerCase().includes(query) || 
      (module.description && module.description.toLowerCase().includes(query))
    );
  }
  
  // Obtenir la progression globale de l'utilisateur
  getUserProgress(): number {
    // Vérifier si l'utilisateur a une propriété progression
    if (this.user && this.user.progression !== undefined) {
      // Si c'est un objet avec percentage
      if (typeof this.user.progression === 'object' && this.user.progression.percentage !== undefined) {
        return this.user.progression.percentage;
      }
      
      // Si c'est directement un nombre
      if (typeof this.user.progression === 'number') {
        return this.user.progression;
      }
    }
    
    // Sinon, calculer à partir des modules
    if (this.userModules.length === 0) {
      return 0;
    }
    
    // Calculer la moyenne des progressions de tous les modules
    const totalProgress = this.userModules.reduce((sum, module) => sum + this.getModuleProgress(module), 0);
    return Math.round(totalProgress / this.userModules.length);
  }
  
  // Obtenir le pourcentage de progression d'un module
  getModuleProgress(module: any): number {
    // Vérifier si le module a des données de progression via l'API
    if (module.progression && module.progression.percentage !== undefined) {
      return module.progression.percentage;
    }
    
    // Fallback sur l'ancien format de données
    if (typeof module.progression === 'number') {
      return module.progression;
    }
    
    // Si aucune progression n'est trouvée
    return 0;
  }
  
  // Vérifier si un module est terminé
  isModuleCompleted(module: any): boolean {
    return this.getModuleProgress(module) === 100;
  }
  
  // Vérifier si un module est en cours
  isModuleInProgress(module: any): boolean {
    const progress = this.getModuleProgress(module);
    return progress > 0 && progress < 100;
  }
  
  // Naviguer vers l'onglet des modules disponibles
  goToAvailableTab(): void {
    // Sélectionner l'onglet des modules disponibles
    const availableTab = document.querySelector('#available-tab') as HTMLElement;
    if (availableTab) {
      // Utiliser Bootstrap pour basculer vers cet onglet
      const tab = new (window as any).bootstrap.Tab(availableTab);
      tab.show();
    }
  }
} 