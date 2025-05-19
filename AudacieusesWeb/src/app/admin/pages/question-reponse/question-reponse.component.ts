import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';

import { ActiviteService } from '../../../services/activite.service';
import { SeanceService } from '../../../services/seance.service';
import { NotificationService } from '../../../services/notification.service';

interface TypeActivite {
  id: number;
  type_activite: string;
  couleur: string;
}

interface Seance {
  id: number;
  titre: string;
}

interface QuestionReponse {
  id: number;
  titre: string;
  description: string;
  contenu: string;
  type_activite_id: number;
  seance_id: number;
  ordre: number;
  duree?: number;
  typeActivite?: TypeActivite;
  seance?: Seance;
}

@Component({
  selector: 'app-question-reponse',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    RouterModule
  ],
  templateUrl: './question-reponse.component.html',
  styleUrls: ['./question-reponse.component.scss']
})
export class QuestionReponseComponent implements OnInit {
  questionForm: FormGroup;
  typeActivites: TypeActivite[] = [];
  seances: Seance[] = [];
  questions: QuestionReponse[] = [];
  isLoading = true;
  isCreating = false;
  isEditing = false;
  currentQuestion: QuestionReponse | null = null;
  questionTypes: any[] = []; // Pour stocker les types d'activités de type "question"

  constructor(
    private fb: FormBuilder,
    private activiteService: ActiviteService,
    private seanceService: SeanceService,
    private notificationService: NotificationService
  ) {
    this.questionForm = this.fb.group({
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
    this.loadTypeActivites();
    this.loadSeances();
    this.loadQuestions();
  }

  loadTypeActivites(): void {
    this.activiteService.getTypeActivites().subscribe({
      next: (data) => {
        this.typeActivites = data.typeActivites;
        // Filtrer pour n'afficher que les types qui contiennent "question" dans le nom
        this.questionTypes = this.typeActivites.filter(type => 
          type.type_activite.toLowerCase().includes('question'));
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

  loadQuestions(): void {
    this.isLoading = true;
    this.activiteService.getAllActivites().subscribe({
      next: (data) => {
        // Filtrer pour n'avoir que les activités de type question
        this.questions = data.activites.filter((activite: QuestionReponse) => 
          activite.typeActivite && 
          activite.typeActivite.type_activite.toLowerCase().includes('question')
        );
        this.isLoading = false;
      },
      error: (error) => {
        this.notificationService.showError('Erreur lors du chargement des questions');
        console.error('Erreur lors du chargement des questions', error);
        this.isLoading = false;
      }
    });
  }

  openCreateForm(): void {
    this.isCreating = true;
    this.isEditing = false;
    this.questionForm.reset({
      ordre: 0,
      duree: null
    });
  }

  openEditForm(question: QuestionReponse): void {
    this.currentQuestion = question;
    this.isEditing = true;
    this.isCreating = false;
    this.questionForm.patchValue({
      titre: question.titre,
      description: question.description || '',
      contenu: question.contenu,
      type_activite_id: question.type_activite_id,
      seance_id: question.seance_id,
      ordre: question.ordre,
      duree: question.duree
    });
  }

  cancelForm(): void {
    this.isCreating = false;
    this.isEditing = false;
    this.currentQuestion = null;
    this.questionForm.reset();
  }

  onSubmit(): void {
    if (this.questionForm.invalid) return;

    const formData = this.questionForm.value;
    
    if (this.isCreating) {
      this.activiteService.createActivite(formData).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('Question créée avec succès');
          this.cancelForm();
          this.loadQuestions();
        },
        error: (error) => {
          this.notificationService.showError('Erreur lors de la création de la question');
          console.error('Erreur lors de la création de la question', error);
        }
      });
    } else if (this.isEditing && this.currentQuestion) {
      this.activiteService.updateActivite(this.currentQuestion.id, formData).subscribe({
        next: (response) => {
          this.notificationService.showSuccess('Question mise à jour avec succès');
          this.cancelForm();
          this.loadQuestions();
        },
        error: (error) => {
          this.notificationService.showError('Erreur lors de la mise à jour de la question');
          console.error('Erreur lors de la mise à jour de la question', error);
        }
      });
    }
  }

  deleteQuestion(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
      this.activiteService.deleteActivite(id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Question supprimée avec succès');
          this.loadQuestions();
        },
        error: (error) => {
          this.notificationService.showError('Erreur lors de la suppression de la question');
          console.error('Erreur lors de la suppression de la question', error);
        }
      });
    }
  }

  // Formater le contenu pour l'affichage
  formatContenu(contenu: string): string {
    // Si le contenu est au format JSON, on l'affiche de manière plus lisible
    try {
      const contentObj = JSON.parse(contenu);
      return JSON.stringify(contentObj, null, 2);
    } catch (e) {
      // Si ce n'est pas du JSON, on retourne le contenu tel quel
      return contenu;
    }
  }
}
