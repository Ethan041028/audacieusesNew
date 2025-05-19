import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SeanceService, Seance, SeancesResponse } from '../../../services/seance.service';
import { NotificationService } from '../../../services/notification.service';
import { ModuleService } from '../../services/module.service';
import { ActiviteService } from '../../../services/activite.service';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

declare var bootstrap: any; // Déclaration pour pouvoir utiliser bootstrap

@Component({
  selector: 'app-seances',
  templateUrl: './seances.component.html',
  styleUrls: ['./seances.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DragDropModule]
})
export class SeancesComponent implements OnInit {
  seances: Seance[] = [];
  modules: any[] = [];
  loading = true;
  error: string | null = null;
  filter = 'all'; // 'all', 'individual', 'group'
  searchQuery = '';
  sortBy = 'date_creation';
  sortOrder = 'desc';
  
  // Formulaire pour la création et l'édition de séances
  seanceForm: FormGroup;
  editingSeance: Seance | null = null;
  
  // Modal pour les utilisateurs de la séance
  selectedSeanceId: number | null = null;
  selectedSeanceUsers: any[] = [];
  
  // Propriétés pour la gestion des activités
  activites: any[] = [];
  typeActivites: any[] = [];
  selectedSeanceActivites: any[] = [];
  loadingActivites = false;
  availableActivites: any[] = [];
  selectedActiviteIds: number[] = [];
  
  constructor(
    private seanceService: SeanceService,
    private moduleService: ModuleService,
    private activiteService: ActiviteService,
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {
    // Initialisation du formulaire avec des validations améliorées
    this.seanceForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      contenu: ['', [Validators.maxLength(2000)]],
      duree: [60, [Validators.required, Validators.min(15), Validators.pattern('^[0-9]+$')]],
      type: ['individuelle', Validators.required],
      statut: ['brouillon', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadSeances();
    this.loadModules();
    this.loadTypeActivites(); // Charger les types d'activités dès l'initialisation
    
    // Réinitialiser le formulaire lorsque le modal est fermé
    const modalElement = document.getElementById('seanceModal');
    if (modalElement) {
      modalElement.addEventListener('hidden.bs.modal', () => {
        this.resetForm();
      });
    }
  }

  resetForm(): void {
    this.seanceForm.reset({
      type: 'individuelle',
      duree: 60,
      statut: 'brouillon'
    });
    this.editingSeance = null;
  }

  loadSeances(): void {
    this.loading = true;
    this.error = null;

    this.seanceService.getAllSeances().subscribe({
      next: (response: SeancesResponse) => {
        this.seances = response.seances;
        // Charger les activités pour chaque séance
        this.loadActivitiesForAllSeances();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des séances', err);
        this.error = 'Erreur lors du chargement des séances. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }

  // Charger les activités pour toutes les séances
  loadActivitiesForAllSeances(): void {
    this.seances.forEach(seance => {
      this.activiteService.getActivitesBySeance(seance.id).subscribe({
        next: (data) => {
          // Attacher les activités à la séance
          seance.activites = data.activites || [];
          
          // Prétraiter les contenus pour éviter le problème [object Object]
          if (seance.activites && Array.isArray(seance.activites)) {
            seance.activites.forEach(activite => {
              // Si le contenu est une chaîne JSON, essayer de la parser
              if (activite.contenu && typeof activite.contenu === 'string') {
                try {
                  activite.contenu = JSON.parse(activite.contenu);
                } catch (e) {
                  // Si ce n'est pas du JSON valide, laisser tel quel
                  console.log(`Contenu non JSON pour l'activité ${activite.id}, gardé comme chaîne`);
                }
              }
            });
          }
        },
        error: (err) => {
          console.error(`Erreur lors du chargement des activités pour la séance ${seance.id}`, err);
        }
      });
    });
  }

  loadModules(): void {
    this.moduleService.getAllModules().subscribe({
      next: (data: any) => {
        this.modules = data.modules || [];
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des modules', err);
        this.notificationService.showError('Erreur lors du chargement des modules');
      }
    });
  }

  // Filtrage des séances
  getFilteredSeances(): Seance[] {
    let filteredSeances = [...this.seances];
    
    // Filtrer par type (individuelle/groupe)
    if (this.filter === 'individual') {
      filteredSeances = filteredSeances.filter(s => s.type === 'individuelle');
    } else if (this.filter === 'group') {
      filteredSeances = filteredSeances.filter(s => s.type === 'groupe');
    }
    
    // Filtrer par recherche
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      filteredSeances = filteredSeances.filter(s => 
        s.titre.toLowerCase().includes(query) || 
        (s.description && s.description.toLowerCase().includes(query))
      );
    }
    
    // Trier les séances
    filteredSeances.sort((a, b) => {
      let valueA, valueB;
      
      switch (this.sortBy) {
        case 'titre':
          valueA = a.titre.toLowerCase();
          valueB = b.titre.toLowerCase();
          break;
        case 'date_creation':
          valueA = new Date(a.date_creation || '').getTime();
          valueB = new Date(b.date_creation || '').getTime();
          break;
        case 'duree':
          valueA = a.duree;
          valueB = b.duree;
          break;
        default:
          valueA = new Date(a.date_creation || '').getTime();
          valueB = new Date(b.date_creation || '').getTime();
      }
      
      const compareResult = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return this.sortOrder === 'asc' ? compareResult : -compareResult;
    });
    
    return filteredSeances;
  }

  // Méthodes de filtrage et tri
  filterSeances(filter: string): void {
    this.filter = filter;
  }
  
  searchSeances(): void {
    // La recherche est gérée dans getFilteredSeances()
  }
  
  sortSeances(sortBy: string): void {
    if (this.sortBy === sortBy) {
      // Inverser l'ordre si on clique sur le même critère de tri
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'asc';
    }
  }

  // Méthodes du formulaire
  editSeance(seance: Seance): void {
    this.editingSeance = seance;
    
    // Remplir le formulaire avec les données de la séance
    this.seanceForm.patchValue({
      titre: seance.titre,
      description: seance.description || '',
      contenu: seance.contenu || '',
      duree: seance.duree,
      type: seance.type,
      statut: seance.statut
    });
    
    // Ouvrir le modal
    const modal = new bootstrap.Modal(document.getElementById('seanceModal'));
    modal.show();
  }

  onSubmitSeanceForm(): void {
    if (this.seanceForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.seanceForm.controls).forEach(key => {
        const control = this.seanceForm.get(key);
        control?.markAsTouched();
      });
      this.notificationService.showError("Veuillez remplir correctement tous les champs obligatoires");
      return;
    }
    
    // Récupérer l'ID de l'utilisateur connecté (nombre entier garanti)
    const userId = this.getLoggedInUserId();
    
    // Convertir les valeurs numériques
    const dureeNum = parseInt(String(this.seanceForm.value.duree), 10);
    
    // Créer l'objet de données de la séance avec seulement les champs nécessaires
    const seanceData: any = {
      titre: this.seanceForm.value.titre,
      description: this.seanceForm.value.description || '',
      contenu: this.seanceForm.value.contenu || '',
      duree: !isNaN(dureeNum) && dureeNum > 0 ? dureeNum : 60,
      type: this.seanceForm.value.type || 'individuelle',
      statut: this.seanceForm.value.statut || 'brouillon',
      created_by: userId,
      ordre: 0
    };
    
    console.log('Données du formulaire brutes:', this.seanceForm.value);
    console.log('Données converties à envoyer:', seanceData);
    console.log('Types de données critiques:', {
      duree: typeof seanceData.duree + ' - ' + seanceData.duree,
      created_by: typeof seanceData.created_by + ' - ' + seanceData.created_by
    });
    
    if (this.editingSeance) {
      // Mise à jour d'une séance existante
      this.seanceService.updateSeance(this.editingSeance.id, seanceData).subscribe({
        next: (response) => {
          // Mettre à jour la séance dans le tableau local
          const index = this.seances.findIndex(s => s.id === this.editingSeance!.id);
          if (index !== -1) {
            this.seances[index] = { ...this.seances[index], ...response.seance };
          }
          
          // Fermer le modal et afficher un message de succès
          const closeButton = document.getElementById('seanceModal')?.querySelector('.btn-close') as HTMLElement;
          if (closeButton) closeButton.click();
          
          this.notificationService.showSuccess('Séance mise à jour avec succès');
          this.resetForm();
        },
        error: (err: any) => {
          console.error('Erreur lors de la mise à jour de la séance', err);
          this.notificationService.showError(`Erreur lors de la mise à jour de la séance: ${err.error?.message || err.message}`);
        }
      });
    } else {
      // Création d'une nouvelle séance
      this.seanceService.createSeance(seanceData).subscribe({
        next: (response) => {
          // Ajouter la nouvelle séance au tableau local
          this.seances.unshift(response.seance);
          
          // Fermer le modal et afficher un message de succès
          const closeButton = document.getElementById('seanceModal')?.querySelector('.btn-close') as HTMLElement;
          if (closeButton) closeButton.click();
          
          this.notificationService.showSuccess('Séance créée avec succès');
          this.resetForm();
        },
        error: (err: any) => {
          console.error('Erreur lors de la création de la séance', err);
          console.error('Détails de l\'erreur:', err.error);
          this.notificationService.showError(`Erreur lors de la création de la séance: ${err.error?.message || err.message}`);
        }
      });
    }
  }

  // Obtenir l'ID de l'utilisateur connecté
  private getLoggedInUserId(): number {
    // Récupérer l'utilisateur depuis le localStorage
    const userJSON = localStorage.getItem('currentUser');
    if (userJSON) {
      try {
        const userData = JSON.parse(userJSON);
        const userId = userData.user?.id;
        
        // S'assurer que l'ID est un nombre
        if (userId && !isNaN(Number(userId))) {
          console.log('ID utilisateur récupéré:', userId);
          return Number(userId);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'ID utilisateur', error);
      }
    }
    
    // Si aucun ID valide n'est trouvé, récupérer l'ID de l'administrateur système
    // ou utiliser un ID par défaut qui existe certainement dans la base de données
    const defaultUserId = 1; // ID administrateur système
    console.log('Utilisation de l\'ID utilisateur par défaut:', defaultUserId);
    return defaultUserId;
  }

  deleteSeance(seance: Seance): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) {
      this.seanceService.deleteSeance(seance.id).subscribe({
        next: () => {
          // Supprimer la séance du tableau local
          this.seances = this.seances.filter(s => s.id !== seance.id);
          this.notificationService.showSuccess('Séance supprimée avec succès');
        },
        error: (err: any) => {
          console.error('Erreur lors de la suppression de la séance', err);
          this.notificationService.showError('Erreur lors de la suppression de la séance');
        }
      });
    }
  }

  duplicateSeance(seanceId: number): void {
    // Trouver la séance à dupliquer
    const seanceToDuplicate = this.seances.find(s => s.id === seanceId);
    
    if (!seanceToDuplicate) {
      this.notificationService.showError('Séance introuvable');
      return;
    }
    
    // Récupérer l'ID de l'utilisateur connecté
    const userId = this.getLoggedInUserId();
    
    // Vérifier et définir la durée avec une valeur par défaut si nécessaire
    // Si duree est NaN ou <= 0, assigner une valeur par défaut de 60
    const dureeValue = seanceToDuplicate.duree || 0;
    const dureeNumber = parseInt(dureeValue.toString(), 10);
    const duree = isNaN(dureeNumber) || dureeNumber <= 0 ? 60 : dureeNumber;
    
    // Créer une copie de la séance (sans l'ID) avec tous les champs nécessaires
    const duplicatedSeanceData = {
      titre: `${seanceToDuplicate.titre} (copie)`,
      description: seanceToDuplicate.description || '',
      contenu: seanceToDuplicate.contenu || '',
      duree: duree,
      type: seanceToDuplicate.type || 'individuelle',
      statut: 'brouillon', // Toujours mettre la séance dupliquée en brouillon
      created_by: userId,
      ordre: 0 // Ajouter l'ordre qui est obligatoire
    };
    
    console.log('Données pour duplication (types):', {
      duree: typeof duree + ' - ' + duree,
      created_by: typeof userId + ' - ' + userId
    });
    console.log('Données complètes pour duplication:', duplicatedSeanceData);
    
    // Appeler l'API pour créer la nouvelle séance
    this.seanceService.createSeance(duplicatedSeanceData).subscribe({
      next: (response) => {
        // Ajouter la nouvelle séance au tableau local
        this.seances.unshift(response.seance);
        this.notificationService.showSuccess('Séance dupliquée avec succès');
      },
      error: (err: any) => {
        console.error('Erreur lors de la duplication de la séance', err);
        this.notificationService.showError(`Erreur lors de la duplication de la séance: ${err.error?.message || err.message}`);
      }
    });
  }

  changeSeanceStatus(seanceId: number, newStatus: 'brouillon' | 'publié'): void {
    // Trouver la séance à mettre à jour
    const seanceToUpdate = this.seances.find(s => s.id === seanceId);
    
    if (!seanceToUpdate) {
      this.notificationService.showError('Séance introuvable');
      return;
    }
    
    // Mettre à jour uniquement le statut
    this.seanceService.updateSeance(seanceId, { statut: newStatus }).subscribe({
      next: () => {
        // Mettre à jour le statut dans le tableau local
        seanceToUpdate.statut = newStatus;
        
        const statusText = newStatus === 'publié' ? 'publiée' : 'mise en brouillon';
        this.notificationService.showSuccess(`Séance ${statusText} avec succès`);
      },
      error: (err: any) => {
        console.error(`Erreur lors de la mise à jour du statut de la séance`, err);
        this.notificationService.showError(`Erreur lors du changement de statut de la séance`);
      }
    });
  }
  previewSeance(seance: Seance): void {
    // Ouvrir la prévisualisation dans un nouvel onglet
    window.open(`/seance/${seance.id}/preview`, '_blank');
  }

  // Méthodes pour la gestion des utilisateurs
  addUsersToSeance(seanceId: number): void {
    this.selectedSeanceId = seanceId;
    
    // Pour l'instant, une version simplifiée car getSeanceUsers n'existe pas encore
    this.selectedSeanceUsers = [];
    
    // Ouvrir le modal
    const modal = new bootstrap.Modal(document.getElementById('usersModal'));
    modal.show();
  }

  // Vérifie si une valeur est un objet
  isObject(val: any): boolean {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
  }

  // Formate un contenu objet pour l'affichage
  formatContenuForDisplay(contenu: any): string {
    try {
      // Vérifier si c'est une chaîne JSON
      if (typeof contenu === 'string') {
        try {
          contenu = JSON.parse(contenu);
        } catch (e) {
          // Si ce n'est pas du JSON, retourner la chaîne telle quelle
          return contenu;
        }
      }
      
      // Extraire les propriétés importantes
      if (this.isObject(contenu)) {
        // Récupérer les premières propriétés pour un aperçu
        const props = Object.keys(contenu);
        if (props.length === 0) return '{}';
        
        // Afficher seulement les premières propriétés
        return props.slice(0, 3).map(key => {
          const value = contenu[key];
          // Éviter la récursion infinie en limitant l'affichage des valeurs complexes
          const displayValue = this.isObject(value) ? '[...]' : 
                             Array.isArray(value) ? `[${value.length} items]` : 
                             typeof value === 'string' && value.length > 20 ? value.substring(0, 20) + '...' : 
                             value;
          return `${key}: ${displayValue}`;
        }).join(', ') + (props.length > 3 ? ', ...' : '');
      }
      
      // Dernier recours, utiliser JSON.stringify avec limite de profondeur
      return JSON.stringify(contenu, null, 0).substring(0, 50) + (JSON.stringify(contenu).length > 50 ? '...' : '');
    } catch (error) {
      console.error('Erreur lors du formatage du contenu', error);
      return '[Contenu non affichable]';
    }
  }

  saveSeanceUsers(): void {
    if (!this.selectedSeanceId) {
      return;
    }
    
    // Cette méthode sera implémentée ultérieurement
    this.notificationService.showInfo('La gestion des utilisateurs est en cours de développement');
    
    // Fermer le modal
    const closeButton = document.getElementById('usersModal')?.querySelector('.btn-close') as HTMLElement;
    if (closeButton) closeButton.click();
  }

  // Méthode pour obtenir le nom du module
  getModuleName(moduleId: number): string {
    const module = this.modules.find(m => m.id === moduleId);
    return module ? module.titre : 'Non spécifié';
  }
  
  // Méthodes pour la gestion des activités
  openActivitesModal(seanceId: number): void {
    this.selectedSeanceId = seanceId;
    this.loadingActivites = true;
    this.selectedActiviteIds = [];
    
    // Récupérer les activités de la séance
    this.activiteService.getActivitesBySeance(seanceId).subscribe({
      next: (data) => {
        this.selectedSeanceActivites = data.activites || [];
        
        // Charger aussi toutes les activités disponibles
        this.loadAllActivites();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des activités de la séance', err);
        this.notificationService.showError('Erreur lors du chargement des activités');
        this.loadingActivites = false;
      }
    });
    
    // Ouvrir le modal
    const modal = new bootstrap.Modal(document.getElementById('activitesModal'));
    modal.show();
  }
    loadAllActivites(): void {
    this.activiteService.getAllActivites().subscribe({
      next: (data) => {
        // Toutes les activités
        const allActivites = data.activites || [];

        // Prétraiter les contenus pour éviter le problème [object Object]
        if (allActivites && Array.isArray(allActivites)) {
          allActivites.forEach(activite => {
            // Si le contenu est une chaîne JSON, essayer de la parser
            if (activite.contenu && typeof activite.contenu === 'string') {
              try {
                activite.contenu = JSON.parse(activite.contenu);
              } catch (e) {
                // Si ce n'est pas du JSON valide, laisser tel quel
                console.log(`Contenu non JSON pour l'activité ${activite.id}, gardé comme chaîne`);
              }
            }
          });
        }
        
        // Filtrer pour n'avoir que les activités qui ne sont pas déjà dans la séance
        this.availableActivites = allActivites.filter((activite: any) => 
          !this.selectedSeanceActivites.some(a => a.id === activite.id)
        );
        
        // Charger les types d'activités pour l'affichage
        this.loadTypeActivites();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des activités disponibles', err);
        this.notificationService.showError('Erreur lors du chargement des activités disponibles');
        this.loadingActivites = false;
      }
    });
  }
  
  loadTypeActivites(): void {
    this.activiteService.getTypeActivites().subscribe({
      next: (data) => {
        this.typeActivites = data.typeActivites || [];
        this.loadingActivites = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des types d\'activités', err);
        this.notificationService.showError('Erreur lors du chargement des types d\'activités');
        this.loadingActivites = false;
      }
    });
  }
  
  getTypeActiviteLabel(typeId: number): string {
    const type = this.typeActivites.find(t => t.id === typeId);
    return type ? type.type_activite : 'Type inconnu';
  }
  
  toggleActiviteSelection(activiteId: number): void {
    const index = this.selectedActiviteIds.indexOf(activiteId);
    if (index === -1) {
      this.selectedActiviteIds.push(activiteId);
    } else {
      this.selectedActiviteIds.splice(index, 1);
    }
  }
  addSelectedActivitiesToSeance(): void {
    if (!this.selectedSeanceId || this.selectedActiviteIds.length === 0) {
      return;
    }
    
    // Utiliser directement les observables
    let completedCount = 0;
    this.selectedActiviteIds.forEach(activiteId => {
      this.activiteService.addActiviteToSeance(this.selectedSeanceId!, activiteId).subscribe({
        next: () => {
          completedCount++;
          if (completedCount === this.selectedActiviteIds.length) {
            this.notificationService.showSuccess('Activités ajoutées avec succès');
            this.selectedActiviteIds = [];
            
            // Recharger les activités de la séance
            if (this.selectedSeanceId) {
              this.refreshSeanceActivites(this.selectedSeanceId);
            }
          }
        },
        error: (err) => {
          console.error('Erreur lors de l\'ajout de l\'activité', err);
          this.notificationService.showError('Erreur lors de l\'ajout des activités');
        }
      });
    });
  }
  
  refreshSeanceActivites(seanceId: number): void {
    this.activiteService.getActivitesBySeance(seanceId).subscribe({
      next: (data) => {
        this.selectedSeanceActivites = data.activites || [];
        
        // Prétraiter les contenus pour éviter le problème [object Object]
        if (this.selectedSeanceActivites && Array.isArray(this.selectedSeanceActivites)) {
          this.selectedSeanceActivites.forEach(activite => {
            // Si le contenu est une chaîne JSON, essayer de la parser
            if (activite.contenu && typeof activite.contenu === 'string') {
              try {
                activite.contenu = JSON.parse(activite.contenu);
              } catch (e) {
                // Si ce n'est pas du JSON valide, laisser tel quel
                console.log(`Contenu non JSON pour l'activité ${activite.id}, gardé comme chaîne`);
              }
            }
          });
        }
        
        // Mettre à jour la liste des activités disponibles
        this.loadAllActivites();
      },
      error: (err) => {
        console.error('Erreur lors du rafraîchissement des activités', err);
        this.notificationService.showError('Erreur lors du rafraîchissement des activités');
      }
    });
  }
  
  removeActiviteFromSeance(activiteId: number): void {
    if (!this.selectedSeanceId) return;
    
    if (confirm('Êtes-vous sûr de vouloir retirer cette activité de la séance ?')) {
      this.activiteService.removeActiviteFromSeance(this.selectedSeanceId, activiteId).subscribe({
        next: () => {
          this.notificationService.showSuccess('Activité retirée avec succès');
          
          // Recharger les activités de la séance
          this.refreshSeanceActivites(this.selectedSeanceId!);
        },
        error: (err) => {
          console.error('Erreur lors du retrait de l\'activité', err);
          this.notificationService.showError('Erreur lors du retrait de l\'activité');
        }
      });
    }
  }
  
  onDrop(event: CdkDragDrop<any[]>): void {
    if (!this.selectedSeanceId) return;
    
    moveItemInArray(this.selectedSeanceActivites, event.previousIndex, event.currentIndex);
    
    // Mettre à jour l'ordre des activités dans le tableau
    this.selectedSeanceActivites.forEach((activite, index) => {
      activite.ordre = index;
    });
    
    // Préparer les données pour l'API
    const ordreData = this.selectedSeanceActivites.map(activite => ({
      id: activite.id,
      ordre: activite.ordre
    }));
    
    this.activiteService.reorderActivites(this.selectedSeanceId, ordreData).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Ordre des activités mis à jour');
        this.selectedSeanceActivites = response.activites;
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de l\'ordre des activités', err);
        this.notificationService.showError('Erreur lors de la mise à jour de l\'ordre des activités');
        
        // Recharger les activités pour rétablir l'ordre correct
        this.refreshSeanceActivites(this.selectedSeanceId!);
      }
    });
  }
}
