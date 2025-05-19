import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActiviteService } from '../../../services/activite.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-question-activite',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './question-activite.component.html',
  styleUrls: ['./question-activite.component.scss']
})
export class QuestionActiviteComponent implements OnInit {
  @Input() activite: any;
  @Output() completed = new EventEmitter<void>();
  
  reponseForm: FormGroup;
  qcmForm: FormGroup;
  qcmData: any = null;
  userReponse: string = '';
  reponseSubmitted: boolean = false;
  isSubmitting: boolean = false;
  
  constructor(
    private fb: FormBuilder,
    private activiteService: ActiviteService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.reponseForm = this.fb.group({
      reponse: ['', Validators.required]
    });
    
    this.qcmForm = this.fb.group({
      choix: [null, Validators.required]
    });
  }
  
  ngOnInit(): void {
    if (this.isQCMType()) {
      try {
        // Vérifier si le contenu est déjà un objet ou une chaîne JSON
        let contentData = this.activite.contenu;
        
        // Première couche de parsing si c'est une chaîne
        if (typeof contentData === 'string') {
          contentData = JSON.parse(contentData);
        }
        
        // Vérifier si le contenu est enveloppé dans un objet "type":"texte"
        if (contentData.type === 'texte' && contentData.contenu) {
          // Deuxième couche de parsing si le contenu est enveloppé
          if (typeof contentData.contenu === 'string') {
            contentData = JSON.parse(contentData.contenu);
          } else {
            contentData = contentData.contenu;
          }
        }
        
        this.qcmData = contentData;
        console.log('QCM Data après traitement:', this.qcmData);
      } catch (e) {
        console.error('Erreur de parsing du contenu QCM', e);
        this.notificationService.showError('Format de QCM invalide');
      }
    }
    
    // Vérifier si l'utilisateur a déjà répondu à cette activité
    this.checkExistingResponse();
  }  
  
  checkExistingResponse(): void {
    const userId = this.authService.currentUserValue?.user?.id;
    if (!userId) return;
    
    this.activiteService.getUserResponsesForActivite(this.activite.id, userId).subscribe({
      next: (response) => {
        if (response && response.reponse) {
          this.userReponse = response.reponse.reponse;
          this.reponseSubmitted = true;
        }
      },
      error: (err) => {
        // Pas de réponse existante, on peut simplement ignorer cette erreur
        console.log('Aucune réponse existante pour cette activité');
      }
    });
  }
  
  isQuestionReponseType(): boolean {
    return this.activite.typeActivite?.type_activite === 'Question-Réponse';
  }
  
  isQCMType(): boolean {
    return this.activite.typeActivite?.type_activite === 'QCM';
  }
  
  getQCMOptions(): string[] {
    if (!this.qcmData) return [];
    
    // Si le format est celui attendu avec des questions au pluriel
    if (this.qcmData.questions && this.qcmData.questions.length > 0) {
      // Prendre la première question
      const firstQuestion = this.qcmData.questions[0];
      return firstQuestion.options || [];
    }
    
    // Format alternatif avec une seule question
    return this.qcmData.options || [];
  }
  
  getQCMQuestion(): string {
    if (!this.qcmData) return '';
    
    // Si le format est celui attendu avec des questions au pluriel
    if (this.qcmData.questions && this.qcmData.questions.length > 0) {
      // Prendre la première question
      const firstQuestion = this.qcmData.questions[0];
      return firstQuestion.texte || '';
    }
    
    // Format alternatif avec une seule question
    return this.qcmData.question || this.qcmData.texte || '';
  }
  
  getQuestionTexte(): string {
    if (!this.activite || !this.activite.contenu) {
      return '';
    }
    
    try {
      // Essayer de parser si c'est une chaîne JSON
      let contentData = this.activite.contenu;
      
      // Si c'est une chaîne, la parser
      if (typeof contentData === 'string') {
        try {
          contentData = JSON.parse(contentData);
        } catch (e) {
          // Si ce n'est pas du JSON valide, le retourner tel quel
          return String(contentData);
        }
      }
      
      // Vérifier si le contenu est enveloppé dans un objet "type":"texte"
      if (contentData.type === 'texte' && contentData.contenu) {
        if (typeof contentData.contenu === 'string') {
          try {
            // Essayer de parser le contenu intérieur
            const innerContent = JSON.parse(contentData.contenu);
            
            // Vérifier si c'est une structure de question
            if (innerContent.questions && innerContent.questions.length > 0) {
              return innerContent.questions[0].texte || '';
            } else if (innerContent.texte) {
              return innerContent.texte;
            }
            
            return JSON.stringify(innerContent);
          } catch (e) {
            // Si ce n'est pas du JSON valide, retourner le contenu tel quel
            return contentData.contenu;
          }
        }
      }
      
      // Si c'est une structure question_reponse ou qcm
      if (contentData.type === 'question_reponse' || contentData.type === 'qcm') {
        if (contentData.questions && contentData.questions.length > 0) {
          return contentData.questions[0].texte || '';
        }
      }
      
      // Formats alternatifs
      if (contentData.texte) {
        return contentData.texte;
      } else if (contentData.question) {
        return contentData.question;
      }
      
      // Si aucun format reconnu, essayer d'afficher une représentation plus informative
      return typeof contentData === 'object' ? 
        'Question: ' + (contentData.questions?.[0]?.texte || contentData.texte || contentData.question || 'Texte non disponible') : 
        String(contentData);
    } catch (e) {
      console.error('Erreur lors de l\'extraction du texte de la question:', e);
      // En cas d'erreur, retourner un message plus informatif
      return "Question non disponible. Veuillez contacter l'administrateur.";
    }
  }
  
  submitReponse(): void {
    if (this.reponseForm.invalid) return;
    
    this.isSubmitting = true;
    const userId = this.authService.currentUserValue?.user?.id;
    
    if (!userId) {
      this.notificationService.showError('Utilisateur non connecté');
      this.isSubmitting = false;
      return;
    }
    
    const reponse = this.reponseForm.get('reponse')?.value;
    
    this.activiteService.saveQuestionResponse(this.activite.id, userId, reponse).subscribe({
      next: (response) => {
        this.userReponse = reponse;
        this.reponseSubmitted = true;
        this.isSubmitting = false;
        this.notificationService.showSuccess('Réponse enregistrée avec succès');
      },
      error: (err) => {
        this.isSubmitting = false;
        this.notificationService.showError('Erreur lors de l\'enregistrement de la réponse');
        console.error('Erreur lors de l\'enregistrement de la réponse', err);
      }
    });
  }
  
  submitQCM(): void {
    if (this.qcmForm.invalid) return;
    
    this.isSubmitting = true;
    const userId = this.authService.currentUserValue?.user?.id;
    
    if (!userId) {
      this.notificationService.showError('Utilisateur non connecté');
      this.isSubmitting = false;
      return;
    }
    
    const selectedOption = this.qcmForm.get('choix')?.value;
    // Récupérer l'option sélectionnée
    const selectedOptionText = this.getQCMOptions()[selectedOption] || '';
    
    // Formatons la réponse comme un JSON avec l'option sélectionnée et son texte
    const reponse = JSON.stringify({ 
      selectedOption: selectedOption,
      selectedOptionText: selectedOptionText
    });
    
    this.activiteService.saveQuestionResponse(this.activite.id, userId, reponse).subscribe({
      next: (response) => {
        this.userReponse = reponse;
        this.reponseSubmitted = true;
        this.isSubmitting = false;
        this.notificationService.showSuccess('Réponse enregistrée avec succès');
      },
      error: (err) => {
        this.isSubmitting = false;
        this.notificationService.showError('Erreur lors de l\'enregistrement de la réponse');
        console.error('Erreur lors de l\'enregistrement de la réponse', err);
      }
    });
  }
  
  getUserQcmResponse(): string {
    if (!this.userReponse) return '';
    
    try {
      // Essayer de parser la réponse stockée
      let parsedResponse;
      
      try {
        parsedResponse = JSON.parse(this.userReponse);
      } catch (e) {
        // Si la réponse n'est pas du JSON, la retourner telle quelle
        return `<strong>Votre réponse :</strong> ${this.userReponse}`;
      }
      
      // Si selectedOptionText est disponible dans la réponse, l'utiliser directement
      if (parsedResponse.selectedOptionText) {
        return `<strong>Votre réponse :</strong> ${parsedResponse.selectedOptionText}`;
      }
      
      // Sinon, utiliser l'index pour récupérer l'option
      const optionIndex = parsedResponse.selectedOption;
      
      // Vérifier si nous avons un format avec questions (au pluriel)
      if (this.qcmData && this.qcmData.questions && this.qcmData.questions.length > 0) {
        const options = this.qcmData.questions[0].options;
        if (options && Array.isArray(options) && options.length > optionIndex) {
          return `<strong>Votre réponse :</strong> ${options[optionIndex]}`;
        }
      }
      
      // Format alternatif avec une seule question
      if (this.qcmData && this.qcmData.options && Array.isArray(this.qcmData.options)) {
        return `<strong>Votre réponse :</strong> ${this.qcmData.options[optionIndex] || ''}`;
      }
      
      // Si on a un optionIndex mais pas d'accès aux textes des options
      if (optionIndex !== undefined) {
        return `<strong>Votre réponse :</strong> Option ${optionIndex + 1}`;
      }
      
      // Si c'est un objet, mais pas dans un format attendu
      if (typeof parsedResponse === 'object') {
        return `<strong>Votre réponse :</strong> ${JSON.stringify(parsedResponse)}`;
      }
      
      // Cas par défaut - réponse brute
      return `<strong>Votre réponse :</strong> ${this.userReponse}`;
    } catch (e) {
      console.error('Erreur lors du parsing de la réponse QCM', e);
      // En cas d'erreur, retourner un message plus clair qu'[object Object]
      if (typeof this.userReponse === 'string') {
        return `<strong>Votre réponse :</strong> ${this.userReponse}`;
      } else if (this.userReponse && typeof this.userReponse === 'object') {
        return `<strong>Votre réponse a été enregistrée</strong>`;
      } else {
        return '<strong>Votre réponse a été enregistrée</strong>';
      }
    }
  }
  
  continueToNext(): void {
    this.completed.emit();
  }
}
