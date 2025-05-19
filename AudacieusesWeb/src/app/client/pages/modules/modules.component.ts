import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ModuleService } from '../../../client/services/module.service';
import { SocketService } from '../../../services/socket.service';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../../services/notification.service';

interface ModuleProgression {
  percentage: number;
  status: string;
  completed: number;
  total: number;
  date_completion?: Date;
  date_mise_a_jour?: Date;
}

interface Module {
  id: number;
  titre: string;
  description?: string;
  statut: string;
  date_creation?: Date;
  progression?: ModuleProgression;
  seances?: any[];
  image_url?: string;
}

@Component({
  selector: 'app-modules',
  templateUrl: './modules.component.html',
  styleUrls: ['./modules.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule]
})
export class ModulesComponent implements OnInit, OnDestroy {
  modules: Module[] = [];
  loading = true;
  error: string | null = null;
  userId: number | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private moduleService: ModuleService,
    private authService: AuthService,
    private socketService: SocketService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.userId = this.authService.currentUserValue?.user?.id || null;
    console.log('ID utilisateur connecté:', this.userId);
    
    if (this.userId) {
      // Charger les modules initialement
      this.loadUserModules();
      
      // Se connecter au socket si nécessaire
      this.socketService.connect(this.userId);
      
      // Écouter les notifications de module complété
      this.subscriptions.push(
        this.socketService.onModuleCompleted().subscribe(data => {
          console.log('Module complété:', data);
          this.notificationService.showSuccess(data.message);
          this.loadUserModules(); // Recharger les modules
        })
      );
      
      // Écouter les notifications de rafraîchissement des modules
      this.subscriptions.push(
        this.socketService.onRefreshModules().subscribe(data => {
          console.log('Rafraîchissement des modules:', data);
          this.loadUserModules(); // Recharger les modules
        })
      );
    } else {
      this.error = "Impossible d'identifier l'utilisateur connecté";
      this.loading = false;
    }
  }
  
  ngOnDestroy(): void {
    // Se désabonner de tous les observables
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadUserModules() {
    this.loading = true;
    this.error = null;
    
    if (!this.userId) {
      this.error = "Aucun utilisateur connecté";
      this.loading = false;
      return;
    }
    
    console.log('Chargement des modules pour l\'utilisateur:', this.userId);
    
    this.moduleService.getUserModules(this.userId).subscribe({
      next: (response) => {
        console.log('Réponse complète de l\'API des modules:', JSON.stringify(response, null, 2));
        
        // Vérifier si les modules existent
        if (response.modules && response.modules.length > 0) {
          // Traiter chaque module pour s'assurer que les données de progression sont correctement formatées
          this.modules = response.modules.map((module: Module) => {
            console.log(`Traitement du module ${module.id} (${module.titre}):`);
            console.log(`Progression originale:`, JSON.stringify(module.progression, null, 2));
            
            // Vérifier si le module a une progression
            if (!module.progression) {
              console.warn(`Module ${module.id} - Création d'une progression par défaut`);
              module.progression = {
                percentage: 0,
                status: 'NON_COMMENCE',
                completed: 0,
                total: module.seances?.length || 0
              };
            } 
            
            // Forcer la conversion du pourcentage en nombre
            if (module.progression) {
              if (typeof module.progression.percentage === 'string') {
                console.log(`Module ${module.id} - Conversion du pourcentage string "${module.progression.percentage}" en nombre`);
                module.progression.percentage = Number(module.progression.percentage);
              }
              
              // Assurer une valeur numérique valide pour percentage
              if (isNaN(module.progression.percentage)) {
                console.warn(`Module ${module.id} - Pourcentage invalide, réinitialisation à 0`);
                module.progression.percentage = 0;
              }
              
              // Déterminer le statut en fonction du pourcentage si statut non défini ou incorrect
              if (!module.progression.status || 
                  !['NON_COMMENCE', 'EN_COURS', 'TERMINE'].includes(module.progression.status)) {
                console.warn(`Module ${module.id} - Statut invalide "${module.progression.status}", détermination basée sur le pourcentage`);
                
                if (module.progression.percentage === 100) {
                  module.progression.status = 'TERMINE';
                } else if (module.progression.percentage > 0) {
                  module.progression.status = 'EN_COURS';
                } else {
                  module.progression.status = 'NON_COMMENCE';
                }
              }
            }
            
            // S'assurer que les valeurs de completed et total sont cohérentes
            if (module.progression && module.seances) {
              // Si total n'est pas défini, utiliser le nombre de séances
              if (!module.progression.total || module.progression.total === 0) {
                module.progression.total = module.seances.length;
              }
              
              // Si completed n'est pas défini, calculer à partir du pourcentage
              if (module.progression.completed === undefined) {
                module.progression.completed = Math.round((module.progression.percentage / 100) * module.progression.total);
              }
            }
            
            console.log(`Module ${module.id} - Progression finale:`, JSON.stringify(module.progression, null, 2));
            return module;
          });
          
          // Forcer le rafraîchissement de l'affichage
          setTimeout(() => {
            console.log('État final des modules:', this.modules);
          }, 0);
        } else {
          this.modules = [];
          console.warn('Aucun module disponible');
        }
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des modules', err);
        this.error = 'Impossible de charger vos modules. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }
  
  // Méthode utilitaire pour obtenir le bon texte d'affichage du statut 
  getStatusText(status: string): string {
    console.log(`Demande de texte pour statut: "${status}"`);
    switch (status) {
      case 'TERMINE': return 'TERMINÉ';
      case 'EN_COURS': return 'EN COURS';
      case 'NON_COMMENCE': return 'NON COMMENCÉ';
      default: return status || 'NON COMMENCÉ';
    }
  }
  
  // Méthode pour déboguer l'affichage du statut d'un module
  debugModuleStatus(module: Module): string {
    if (!module) return 'Module indéfini';
    if (!module.progression) return 'Progression indéfinie';
    return `Module ${module.id}: Statut=${module.progression.status}, Pourcentage=${module.progression.percentage}%`;
  }
}
