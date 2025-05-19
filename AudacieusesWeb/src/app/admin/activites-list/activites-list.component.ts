import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActiviteService } from '../../services/activite.service';
import { SeanceService } from '../../services/seance.service';
import { NotificationService } from '../../../app/services/notification.service';
import { ActivatedRoute, RouterModule, RouterLink } from '@angular/router';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';

// Importation des modules Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-activites-list',
  templateUrl: './activites-list.component.html',
  styleUrls: ['./activites-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    RouterLink,
    DragDropModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ]
})
export class ActivitesListComponent implements OnInit {
  activites: any[] = [];
  typeActivites: any[] = [];
  seances: any[] = [];
  isLoading = true;
  isCreating = false;
  isEditing = false;
  currentActivite: any = null;
  activiteForm: FormGroup;
  seanceId: number | null = null;
  currentSeance: any = null;

  constructor(
    private activiteService: ActiviteService,
    private seanceService: SeanceService,
    private notificationService: NotificationService,
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
    this.route.paramMap.subscribe(params => {
      const seanceIdParam = params.get('seanceId');
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
        this.activites = data.activites;
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
        this.activites = data.activites;
        this.currentSeance = data.seance;
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
}
