import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SeanceService } from '../../../services/seance.service';
import { ActiviteService } from '../../../services/activite.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { ActivityCompletionService } from '../../../services/activity-completion.service';
import { QuestionActiviteComponent } from '../../components/question-activite/question-activite.component';
import { VideoActiviteComponent } from '../../components/video-activite/video-activite.component';
import { TextActiviteComponent } from '../../components/text-activite/text-activite.component';
import { DocumentActiviteComponent } from '../../components/document-activite/document-activite.component';

@Component({
  selector: 'app-seance-detail',
  templateUrl: './seance-detail.component.html',
  styleUrls: ['./seance-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    QuestionActiviteComponent,
    VideoActiviteComponent,
    TextActiviteComponent,
    DocumentActiviteComponent
  ]
})
export class SeanceDetailComponent implements OnInit {
  seanceId: number = 0;
  moduleId: number = 0;
  seance: any;
  activites: any[] = [];
  currentActiviteIndex = 0;
  loading = {
    seance: true,
    activites: true,
    suiviUpdate: false
  };
  error: {
    seance: string | null,
    activites: string | null,
    suiviUpdate: string | null
  } = {
    seance: null,
    activites: null,
    suiviUpdate: null
  };
  success: string | null = null;
  reponseForm: FormGroup;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seanceService: SeanceService,
    private activiteService: ActiviteService,
    private authService: AuthService,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private activityCompletionService: ActivityCompletionService
  ) {
    this.reponseForm = this.fb.group({
      reponse: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.seanceId = +params['id'];
      this.loadSeanceDetails();
    });
  }

  loadSeanceDetails(): void {
    this.loading.seance = true;
    this.error.seance = null;

    this.seanceService.getSeanceById(this.seanceId).subscribe({
      next: (data) => {
        this.seance = data.seance;
        this.moduleId = this.seance.moduleId;
        this.loading.seance = false;
        this.loadActivites();
      },
      error: (err) => {
        this.error.seance = `Erreur lors du chargement de la séance: ${err.message}`;
        this.loading.seance = false;
      }
    });
  }
  loadActivites(): void {
    this.loading.activites = true;
    this.error.activites = null;

    this.activiteService.getActivitesBySeance(this.seanceId).subscribe({
      next: (data: any) => {
        this.activites = data.activites;
        this.loading.activites = false;
      },
      error: (err: any) => {
        this.error.activites = `Erreur lors du chargement des activités: ${err.message}`;
        this.loading.activites = false;
      }
    });
  }

  // Navigation entre les activités
  nextActivite(): void {
    if (this.currentActiviteIndex < this.activites.length - 1) {
      this.currentActiviteIndex++;
      this.scrollToTop();
    } else {
      this.completeSeance();
    }
  }

  previousActivite(): void {
    if (this.currentActiviteIndex > 0) {
      this.currentActiviteIndex--;
      this.scrollToTop();
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Obtenir l'activité courante
  getCurrentActivite(): any {
    const activite = this.activites[this.currentActiviteIndex];
    
    // Déterminer le type correct de l'activité
    if (activite) {
      // Si l'activité a un typeActivite.type_activite défini, l'utiliser
      if (activite.typeActivite && activite.typeActivite.type_activite) {
        activite.type = activite.typeActivite.type_activite;
      }
      // Sinon utiliser le type déjà présent ou VIDEO/LECTURE par défaut
      else if (!activite.type) {
        activite.type = 'LECTURE';
      }
    }
    
    return activite;
  }

  // Vérifier si c'est la dernière activité
  isLastActivite(): boolean {
    return this.currentActiviteIndex === this.activites.length - 1;
  }  // Soumettre une réponse pour une activité
  submitReponse(): void {
    if (this.reponseForm.invalid) return;

    const currentActivite = this.getCurrentActivite();
    const userId = this.authService.currentUserValue?.user?.id;

    if (!userId) {
      this.notificationService.showError("Erreur: utilisateur non identifié");
      return;
    }

    const reponseData = {
      activite_id: currentActivite.id,
      contenu: this.reponseForm.value.reponse
    };

    // Utiliser le service de complétion d'activité
    this.activityCompletionService.markActivityAsCompleted(
      currentActivite.id, 
      { 
        reponse: this.reponseForm.value.reponse,
        type: 'QUIZ'
      }
    ).subscribe({
      next: () => {
        this.notificationService.showSuccess('Réponse enregistrée avec succès!');
        this.reponseForm.reset();
        setTimeout(() => {
          this.nextActivite();
        }, 1500);
      },
      error: (err: any) => {
        this.notificationService.showError(`Erreur lors de l'enregistrement de la réponse: ${err.message}`);
      }
    });
  }
  // Marquer la séance comme terminée
  completeSeance(): void {
    this.loading.suiviUpdate = true;

    // Utiliser updateSuivi qui existe dans le service au lieu de markSeanceAsCompleted
    this.seanceService.updateSuivi(this.seanceId, { progression: 100, statut: 'TERMINE' }).subscribe({
      next: (response: any) => {
        this.loading.suiviUpdate = false;
        this.notificationService.showSuccess('Séance terminée avec succès!');
        
        setTimeout(() => {
          this.returnToModule();
        }, 1500);
      },
      error: (err: any) => {
        this.loading.suiviUpdate = false;
        this.notificationService.showError(`Erreur lors de la mise à jour du suivi: ${err.message}`);
      }
    });
  }

  // Retourner à la page du module
  returnToModule(): void {
    if (this.moduleId) {
      this.router.navigate(['/client/modules', this.moduleId]);
    } else {
      // Rediriger vers la liste des modules si moduleId n'est pas défini
      this.router.navigate(['/client/modules']);
    }
  }
  // Méthode qui n'est plus nécessaire car gérée par le composant video-activite
  onVideoComplete(): void {
    // Cette méthode est conservée pour la compatibilité, mais son code est déplacé
    // vers le composant video-activite
  }
  
  // Méthode auxiliaire pour marquer une activité comme terminée
  markActiviteAsCompleted(activiteId: number): void {
    const currentActivite = this.getCurrentActivite();
    
    // Utiliser le service de complétion d'activité
    this.activityCompletionService.markActivityAsCompleted(
      activiteId, 
      { type: currentActivite.type }
    ).subscribe({
      next: () => {
        // Si c'est une activité qui progresse automatiquement, passons à la suivante
        if (this.isAutomaticProgression(currentActivite)) {
          this.nextActivite();
        }
      },
      error: (err: any) => {
        this.notificationService.showError(`Erreur lors de l'enregistrement de la progression: ${err.message}`);
      }
    });
  }
  // Déterminer si on progresse automatiquement pour ce type d'activité
  isAutomaticProgression(activite: any): boolean {
    return ['LECTURE', 'VIDEO'].includes(activite.type);
  }

  // Déterminer si l'activité est de type Question-Réponse
  isQuestionReponseType(activite: any): boolean {
    return activite.typeActivite?.type_activite === 'Question-Réponse';
  }

  // Déterminer si l'activité est de type QCM
  isQCMType(activite: any): boolean {
    return activite.typeActivite?.type_activite === 'QCM';
  }

  // Vérifier si le contenu est un JSON valide
  isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Parser le contenu QCM
  parseQcmContent(content: string): any {
    try {
      return JSON.parse(content);
    } catch (e) {
      return { question: 'Format QCM invalide', options: [] };
    }
  }

  // Formater le contenu d'un quiz pour l'affichage
  formatQuizContent(activite: any): string {
    if (!activite || !activite.contenu) {
      return '';
    }
    
    try {
      // Essayer de parser si c'est une chaîne JSON
      let contentData = activite.contenu;
      
      if (typeof contentData === 'string') {
        try {
          contentData = JSON.parse(contentData);
        } catch (e) {
          // Si ce n'est pas du JSON valide, le retourner tel quel
          return contentData;
        }
      }
      
      // Vérifier si le contenu est enveloppé dans un objet "type":"texte"
      if (contentData.type === 'texte' && contentData.contenu) {
        if (typeof contentData.contenu === 'string') {
          try {
            // Essayer de parser le contenu intérieur
            const innerContent = JSON.parse(contentData.contenu);
            return this.renderQuizContent(innerContent);
          } catch (e) {
            // Si ce n'est pas du JSON valide, retourner le contenu tel quel
            return contentData.contenu;
          }
        } else {
          return this.renderQuizContent(contentData.contenu);
        }
      }
      
      // Si c'est déjà une structure QCM ou question-réponse
      if (contentData.type === 'qcm' || contentData.type === 'question_reponse') {
        return this.renderQuizContent(contentData);
      }
      
      // Si c'est un objet sans structure connue, le convertir en texte lisible
      if (typeof contentData === 'object') {
        return this.renderQuizContent(contentData);
      }
      
      // Retourner le contenu tel quel s'il est déjà sous forme de texte
      return String(contentData);
    } catch (e) {
      console.error('Erreur lors du formatage du contenu du quiz:', e);
      // En cas d'erreur, retourner un message plus informatif
      return "Erreur d'affichage du contenu. Veuillez contacter l'administrateur.";
    }
  }
  
  // Rendre le contenu d'un quiz en HTML lisible
  private renderQuizContent(content: any): string {
    if (!content) {
      return '';
    }
    
    // Si c'est un QCM
    if (content.type === 'qcm' && content.questions && Array.isArray(content.questions)) {
      let html = '<div class="quiz-questions">';
      
      content.questions.forEach((question: any, index: number) => {
        html += `<div class="quiz-question">
          <p class="question-text"><strong>Question ${index + 1}:</strong> ${question.texte || ''}</p>
          <ul class="options-list">`;
          
        if (question.options && Array.isArray(question.options)) {
          question.options.forEach((option: string, optIndex: number) => {
            html += `<li class="option">${option}</li>`;
          });
        }
        
        html += `</ul></div>`;
      });
      
      html += '</div>';
      return html;
    }
    
    // Si c'est un questionnaire simple
    if (content.type === 'question_reponse' && content.questions && Array.isArray(content.questions)) {
      let html = '<div class="quiz-questions">';
      
      content.questions.forEach((question: any, index: number) => {
        html += `<div class="quiz-question">
          <p class="question-text"><strong>Question ${index + 1}:</strong> ${question.texte || ''}</p>
        </div>`;
      });
      
      html += '</div>';
      return html;
    }
    
    // Pour tout autre type de contenu structuré
    if (typeof content === 'object') {
      // Vérifier s'il y a une propriété texte ou question
      if (content.texte) {
        return `<p>${content.texte}</p>`;
      } else if (content.question) {
        return `<p>${content.question}</p>`;
      } else if (content.contenu && typeof content.contenu === 'string') {
        return `<p>${content.contenu}</p>`;
      }
      
      // Si aucun format reconnu, essayer d'afficher une représentation JSON formatée
      return `<pre>${JSON.stringify(content, null, 2)}</pre>`;
    }
    
    // Si c'est une chaîne, la retourner telle quelle
    return String(content);
  }
}