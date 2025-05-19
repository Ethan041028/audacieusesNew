import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { ActiviteService } from '../../../services/activite.service';
import { SeanceService } from '../../../services/seance.service';
import { NotificationService } from '../../../../app/services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { ActiviteFormComponent } from '../../../components/activite-form/activite-form.component';
import { Activite } from '../../../models/activite.model';

@Component({
  selector: 'app-activites',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    DragDropModule,
    ActiviteFormComponent
  ],
  templateUrl: './activites.component.html',
  styleUrl: './activites.component.scss'
})
export class ActivitesComponent implements OnInit {
  activites: any[] = [];
  typeActivites: any[] = [];
  seances: any[] = [];
  isLoading = true;
  isCreating = false;
  isEditing = false;
  currentActivite: any = null;
  activiteForm: FormGroup;
  seanceId: number | null = null;  currentSeance: any = null;
  useNewForm = true; // Indicateur pour utiliser le nouveau formulaire
  selectedSeanceId: number | null = null; // Pour stocker l'ID de la séance sélectionnée pour ajouter des activités

  constructor(
    private activiteService: ActiviteService,
    private seanceService: SeanceService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.activiteForm = this.fb.group({
      titre: ['', [Validators.required]],
      description: [''],
      contenu: ['', [Validators.required]],
      type_activite_id: ['', [Validators.required]],
      seance_id: ['', [Validators.required]],
      ordre: [0],
      duree: [null]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const seanceIdParam = params['seanceId'];
      if (seanceIdParam) {
        this.seanceId = +seanceIdParam;
        this.loadActivitesBySeance(this.seanceId);
      } else {
        this.loadAllActivites();
      }
    });
    
    this.loadTypeActivites();
    this.loadSeances();
  }

  loadAllActivites(): void {
    this.isLoading = true;
    this.activiteService.getAllActivites().subscribe({
      next: (data) => {
        this.activites = data.activites || [];
        
        // Prétraiter les contenus pour éviter le problème [object Object]
        if (this.activites && Array.isArray(this.activites)) {
          this.activites.forEach(activite => {
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
        
        this.isLoading = false;
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors du chargement des activités');
        console.error('Erreur lors du chargement des activités', error);
        this.isLoading = false;
      }
    });
  }

  loadActivitesBySeance(seanceId: number): void {
    this.isLoading = true;
    this.activiteService.getActivitesBySeance(seanceId).subscribe({
      next: (data) => {
        this.activites = data.activites || [];
        this.currentSeance = data.seance;
        
        // Prétraiter les contenus pour éviter le problème [object Object]
        if (this.activites && Array.isArray(this.activites)) {
          this.activites.forEach(activite => {
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
        
        this.isLoading = false;
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors du chargement des activités de la séance');
        console.error('Erreur lors du chargement des activités de la séance', error);
        this.isLoading = false;
      }
    });
  }

  loadTypeActivites(): void {
    this.activiteService.getTypeActivites().subscribe({
      next: (data) => {
        this.typeActivites = data.typeActivites;
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors du chargement des types d\'activités');
        console.error('Erreur lors du chargement des types d\'activités', error);
      }
    });
  }

  loadSeances(): void {
    this.seanceService.getAllSeances().subscribe({
      next: (data) => {
        this.seances = data.seances;
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors du chargement des séances');
        console.error('Erreur lors du chargement des séances', error);
      }
    });
  }

  openCreateForm(): void {
    this.isCreating = true;
    this.isEditing = false;
    this.currentActivite = null;
    this.activiteForm.reset({
      ordre: 0,
      seance_id: this.seanceId || ''
    });
    window.scrollTo(0, 0);
  }

  openEditForm(activite: any): void {
    this.isEditing = true;
    this.isCreating = false;
    this.currentActivite = activite;
    this.activiteForm.patchValue({
      titre: activite.titre,
      description: activite.description,
      contenu: activite.contenu,
      type_activite_id: activite.type_activite_id,
      seance_id: activite.seance_id,
      ordre: activite.ordre,
      duree: activite.duree
    });
    window.scrollTo(0, 0);
  }

  cancelForm(): void {
    this.isCreating = false;
    this.isEditing = false;
    this.currentActivite = null;
    this.activiteForm.reset();
  }
  onSubmit(): void {
    if (this.activiteForm.invalid) {
      this.activiteForm.markAllAsTouched();
      this.notificationService.showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const activiteData = this.activiteForm.value;

    if (this.isCreating) {
      this.createActivite(activiteData);
    } else if (this.isEditing && this.currentActivite) {
      this.updateActivite(this.currentActivite.id, activiteData);
    }
  }

  createActivite(activiteData: any): void {
    // Si nous sommes dans le contexte d'une séance spécifique, assurons-nous que l'activité y est associée
    if (this.seanceId && !activiteData.seance_id) {
      activiteData.seance_id = this.seanceId;
    }
    
    this.activiteService.createActivite(activiteData).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Activité créée avec succès');
        this.cancelForm();
        if (this.seanceId) {
          this.loadActivitesBySeance(this.seanceId);
        } else {
          this.loadAllActivites();
        }
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors de la création de l\'activité');
        console.error('Erreur lors de la création de l\'activité', error);
      }
    });
  }

  updateActivite(id: number, activiteData: any): void {
    this.activiteService.updateActivite(id, activiteData).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Activité mise à jour avec succès');
        this.cancelForm();
        if (this.seanceId) {
          this.loadActivitesBySeance(this.seanceId);
        } else {
          this.loadAllActivites();
        }
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors de la mise à jour de l\'activité');
        console.error('Erreur lors de la mise à jour de l\'activité', error);
      }
    });
  }

  deleteActivite(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) {
      this.activiteService.deleteActivite(id).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('Activité supprimée avec succès');
          if (this.seanceId) {
            this.loadActivitesBySeance(this.seanceId);
          } else {
            this.loadAllActivites();
          }
        },
        error: (error) => {
          this.notificationService.showError('Erreur lors de la suppression de l\'activité');
          console.error('Erreur lors de la suppression de l\'activité', error);
        }
      });
    }
  }

  getTypeActiviteLabel(typeId: number): string {
    const type = this.typeActivites.find(t => t.id === typeId);
    return type ? type.type_activite : 'Type inconnu';
  }

  getSeanceLabel(seanceId: number): string {
    const seance = this.seances.find(s => s.id === seanceId);
    return seance ? seance.titre : 'Séance inconnue';
  }
  drop(event: CdkDragDrop<any[]>): void {
    if (!this.seanceId) return;

    moveItemInArray(this.activites, event.previousIndex, event.currentIndex);
    
    // Mettre à jour l'ordre des activités dans le tableau
    this.activites.forEach((activite, index) => {
      activite.ordre = index;
    });

    // Préparer les données pour l'API
    const ordreData = this.activites.map(activite => ({
      id: activite.id,
      ordre: activite.ordre
    }));

    this.activiteService.reorderActivites(this.seanceId, ordreData).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Ordre des activités mis à jour');
        this.activites = response.activites;
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors de la mise à jour de l\'ordre des activités');
        console.error('Erreur lors de la mise à jour de l\'ordre des activités', error);
        // Recharger les activités pour rétablir l'ordre correct
        this.loadActivitesBySeance(this.seanceId!);
      }
    });
  }

  // Méthodes pour vérifier le type d'activité sélectionné
  isQuestionType(): boolean {
    const typeId = this.activiteForm.get('type_activite_id')?.value;
    if (!typeId) return false;
    
    const selectedType = this.typeActivites.find(t => t.id === typeId);
    return selectedType && 
           (selectedType.type_activite === 'Question-Réponse' || 
            selectedType.type_activite === 'QCM');
  }
  
  isQuestionReponseType(): boolean {
    const typeId = this.activiteForm.get('type_activite_id')?.value;
    if (!typeId) return false;
    
    const selectedType = this.typeActivites.find(t => t.id === typeId);
    return selectedType && selectedType.type_activite === 'Question-Réponse';
  }
    isQCMType(): boolean {
    const typeId = this.activiteForm.get('type_activite_id')?.value;
    if (!typeId) return false;
    
    const selectedType = this.typeActivites.find(t => t.id === typeId);
    return selectedType && selectedType.type_activite === 'QCM';
  }

  // Pour prévisualiser le contenu au format approprié
  formatContenu(contenu: any): string {
    if (typeof contenu !== 'string') {
      return String(contenu);
    }
    try {
      // Essayer de parser le contenu comme JSON (pour les QCM)
      const contentObj = JSON.parse(contenu);
      return JSON.stringify(contentObj, null, 2);
    } catch (e) {
      // Si ce n'est pas du JSON valide, retourner tel quel
      return contenu;
    }
  }

  // Récupérer le type d'activité d'une activité
  getActiviteType(activite: any): string {
    return activite.typeActivite ? activite.typeActivite.type_activite : '';
  }

  // Vérifier si une chaîne est un JSON valide ou déjà un objet
  isValidJson(str: any): boolean {
    // Si c'est déjà un objet (pas une chaîne)
    if (typeof str === 'object' && str !== null) {
      return true;
    }
    
    if (typeof str !== 'string') {
      return false;
    }
    
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Parser le contenu d'un QCM
  parseQcmContent(contenu: any): any {
    if (typeof contenu !== 'string') {
      return { question: 'Format non valide', options: [], correctAnswer: 0 };
    }
    try {
      return JSON.parse(contenu);
    } catch (e) {
      return { question: 'Erreur de format', options: [], correctAnswer: 0 };
    }
  }
  // Méthodes pour le nouveau formulaire
  handleActiviteCreated(activite: Activite): void {
    this.notificationService.showSuccess('Activité créée avec succès');
    this.cancelForm();
    if (this.seanceId) {
      this.loadActivitesBySeance(this.seanceId);
    } else {
      this.loadAllActivites();
    }
  }

  handleActiviteUpdated(activite: Activite): void {
    this.notificationService.showSuccess('Activité mise à jour avec succès');
    this.cancelForm();
    if (this.seanceId) {
      this.loadActivitesBySeance(this.seanceId);
    } else {
      this.loadAllActivites();
    }
  }

  handleFormCancel(): void {
    this.cancelForm();
  }

  // Ajouter une activité existante à la séance courante
  addActiviteToCurrentSeance(activiteId: number): void {
    if (!this.seanceId) {
      this.notificationService.showError('Aucune séance sélectionnée');
      return;
    }

    this.activiteService.addActiviteToSeance(this.seanceId, activiteId).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Activité ajoutée à la séance avec succès');
        this.loadActivitesBySeance(this.seanceId!);
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors de l\'ajout de l\'activité à la séance');
        console.error('Erreur lors de l\'ajout de l\'activité à la séance', error);
      }
    });
  }
  // Retirer une activité de la séance courante sans la supprimer
  removeActiviteFromCurrentSeance(activiteId: number): void {
    if (!this.seanceId) {
      this.notificationService.showError('Aucune séance sélectionnée');
      return;
    }

    this.activiteService.removeActiviteFromSeance(this.seanceId, activiteId).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Activité retirée de la séance avec succès');
        this.loadActivitesBySeance(this.seanceId!);
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors du retrait de l\'activité de la séance');
        console.error('Erreur lors du retrait de l\'activité de la séance', error);
      }
    });
  }

  // Ajouter une activité à une séance spécifique depuis la liste globale
  addActiviteToSeance(seanceId: number, activiteId: number): void {
    this.activiteService.addActiviteToSeance(seanceId, activiteId).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Activité ajoutée à la séance avec succès');
        this.loadAllActivites(); // Recharger pour afficher la mise à jour des relations
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors de l\'ajout de l\'activité à la séance');
        console.error('Erreur lors de l\'ajout de l\'activité à la séance', error);
      }
    });
  }

  // Méthode pour analyser le contenu JSON
  parseContenu(contenuStr: any): any {
    // Si le contenu est déjà un objet (pas une chaîne)
    if (typeof contenuStr !== 'string') {
      return contenuStr || { contenu: 'Contenu non disponible' };
    }
    
    try {
      return JSON.parse(contenuStr);
    } catch (e) {
      return { contenu: contenuStr };
    }
  }

  // Vérifier si une activité est déjà dans une séance spécifique
  activiteInSeance(activite: any, seanceId: number): boolean {
    if (!activite.seances) {
      return false;
    }
    return activite.seances.some((s: any) => s.id === seanceId);
  }
}
