import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ModuleService } from '../../services/module.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../services/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-module-clients',
  templateUrl: './module-clients.component.html',
  styleUrls: ['./module-clients.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class ModuleClientsComponent implements OnInit {
  moduleId: number | null = null;
  module: any = null;
  loading = true;
  userLoading = true;
  error: string | null = null;
  
  // Listes d'utilisateurs
  allUsers: any[] = [];
  moduleUsers: any[] = [];
  availableUsers: any[] = [];
  
  // Recherche et filtres
  searchControl = new FormControl('');
  searchQuery = '';
  roleFilter = 'client'; // 'all', 'client', 'admin'
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private moduleService: ModuleService,
    private userService: UserService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    // Récupérer l'ID du module depuis l'URL
    this.route.params.subscribe(params => {
      this.moduleId = +params['id'];
      this.loadModuleData();
      this.loadUsers();
      
      // Configuration de la recherche
      this.searchControl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe((value: string | null) => {
          this.searchQuery = value || '';
          this.filterUsers();
        });
    });
  }

  // Charger les informations du module
  loadModuleData(): void {
    if (!this.moduleId) return;
    
    this.loading = true;
    this.moduleService.getModuleById(this.moduleId).subscribe({
      next: (response) => {
        this.module = response.module;
        this.loading = false;
      },
      error: (error) => {
        this.error = `Erreur lors du chargement du module: ${error.error}`;
        this.loading = false;
        this.notificationService.showError(this.error);
      }
    });
  }

  // Charger tous les utilisateurs
  loadUsers(): void {
    this.userLoading = true;
    
    // Charger tous les utilisateurs
    this.userService.getAllUsers().subscribe({
      next: (response) => {
        this.allUsers = response.users || [];
        
        // Si nous avons l'ID du module, charger ses utilisateurs
        if (this.moduleId) {
          this.loadModuleUsers();
        } else {
          this.filterUsers();
          this.userLoading = false;
        }
      },
      error: (error) => {
        this.error = `Erreur lors du chargement des utilisateurs: ${error.error}`;
        this.userLoading = false;
        this.notificationService.showError(this.error);
      }
    });
  }

  // Charger les utilisateurs associés au module
  loadModuleUsers(): void {
    if (!this.moduleId) return;
    
    this.userService.getUsersByModule(this.moduleId).subscribe({
      next: (response) => {
        this.moduleUsers = response.users || [];
        this.filterUsers();
        this.userLoading = false;
      },
      error: (error) => {
        this.error = `Erreur lors du chargement des utilisateurs du module: ${error.error}`;
        this.userLoading = false;
        this.notificationService.showError(this.error);
      }
    });
  }

  // Filtrer les utilisateurs disponibles (non associés au module)
  filterUsers(): void {
    // Filtrer par rôle
    let filteredUsers = this.allUsers.filter(user => {
      if (this.roleFilter === 'all') return true;
      return user.role?.role_type === this.roleFilter;
    });
    
    // Filtrer par recherche
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.nom?.toLowerCase().includes(query) || 
        user.prenom?.toLowerCase().includes(query) || 
        user.mail?.toLowerCase().includes(query)
      );
    }
    
    // Exclure les utilisateurs déjà associés au module
    const moduleUserIds = this.moduleUsers.map(user => user.id);
    this.availableUsers = filteredUsers.filter(user => !moduleUserIds.includes(user.id));
  }

  // Attribuer le module à un utilisateur
  assignToUser(userId: number): void {
    if (!this.moduleId) return;
    
    this.moduleService.assignModuleToUser(this.moduleId, userId).subscribe({
      next: () => {
        const user = this.allUsers.find(u => u.id === userId);
        this.notificationService.showSuccess(`Module attribué à ${user?.prenom} ${user?.nom}`);
        
        // Mettre à jour les listes d'utilisateurs
        this.loadModuleUsers();
      },
      error: (error) => {
        this.notificationService.showError(`Erreur lors de l'attribution du module: ${error.error}`);
      }
    });
  }

  // Retirer le module à un utilisateur
  removeFromUser(userId: number): void {
    if (!this.moduleId) return;
    
    this.moduleService.removeModuleFromUser(this.moduleId, userId).subscribe({
      next: () => {
        const user = this.allUsers.find(u => u.id === userId);
        this.notificationService.showSuccess(`Module retiré de ${user?.prenom} ${user?.nom}`);
        
        // Mettre à jour les listes d'utilisateurs
        this.loadModuleUsers();
      },
      error: (error) => {
        this.notificationService.showError(`Erreur lors du retrait du module: ${error.error}`);
      }
    });
  }

  // Filtrer par rôle
  filterByRole(role: string): void {
    this.roleFilter = role;
    this.filterUsers();
  }

  // Retourner à la liste des modules
  goBack(): void {
    this.router.navigate(['/admin/modules']);
  }

  // Obtenir la progression d'un utilisateur pour ce module
  getUserModuleProgress(user: any): number {
    // Vérifier si l'utilisateur a une propriété module_progress qui contient la progression pour ce module
    if (user.module_progress && this.moduleId) {
      // Si c'est un objet avec percentage pour ce moduleId
      if (typeof user.module_progress === 'object') {
        // Vérifier si c'est un tableau de progressions de modules
        if (Array.isArray(user.module_progress)) {
          const moduleProgress = user.module_progress.find((p: any) => p.module_id === this.moduleId);
          if (moduleProgress) {
            return moduleProgress.percentage || 0;
          }
        } 
        // Si c'est un objet avec la progression directe pour ce module
        else if (user.module_progress.module_id === this.moduleId) {
          return user.module_progress.percentage || 0;
        }
      }
    }
    
    // Si le format est différent mais que l'utilisateur a une propriété progression
    if (user.progression !== undefined) {
      // Si c'est un objet avec percentage
      if (typeof user.progression === 'object' && user.progression.percentage !== undefined) {
        return user.progression.percentage;
      }
      
      // Si c'est directement un nombre
      if (typeof user.progression === 'number') {
        return user.progression;
      }
    }
    
    // Si aucune information de progression n'est trouvée
    return 0;
  }
} 