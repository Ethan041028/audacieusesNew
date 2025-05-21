import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Activite, TypeActivite } from '../../models/activite.model';
import { ActiviteService } from '../../services/activite.service';
import { SeanceService } from '../../services/seance.service';
import { QcmUtilsService } from '../../services/qcm-utils.service';
import { QcmFormComponent } from './qcm-form/qcm-form.component';
import { QuestionReponseFormComponent } from './question-reponse-form/question-reponse-form.component';

@Component({
  selector: 'app-activite-form',
  templateUrl: './activite-form.component.html',
  styleUrls: ['./activite-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    QcmFormComponent,
    QuestionReponseFormComponent
  ]
})
export class ActiviteFormComponent implements OnInit {
  @Input() seanceId!: number;
  @Input() activiteToEdit?: Activite;
  @Output() activiteCreated = new EventEmitter<Activite>();
  @Output() activiteUpdated = new EventEmitter<Activite>();
  @Output() cancel = new EventEmitter<void>();
  activiteForm!: FormGroup;
  typesActivite: TypeActivite[] = [];
  seances: any[] = [];
  isLoading = false;
  selectedType: string | null = null;
  constructor(
    private fb: FormBuilder,
    private activiteService: ActiviteService,
    private seanceService: SeanceService,
    private qcmUtilsService: QcmUtilsService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) { }  ngOnInit(): void {
    this.initForm();
    this.loadTypesActivite();
    this.loadSeances();

    // Si une activité est fournie pour l'édition, initialiser le formulaire avec ses valeurs
    if (this.activiteToEdit) {
      console.log('Editing activity:', this.activiteToEdit);
      console.log('Activity type ID:', this.activiteToEdit.type_activite_id);
      console.log('Activity content:', this.activiteToEdit.contenu);
      this.patchFormWithActivite(this.activiteToEdit);
    }

    // Écouter les changements de type d'activité
    this.activiteForm.get('type_activite_id')?.valueChanges.subscribe(value => {
      if (value) {
        // Utiliser NgZone.run pour assurer que le changement est détecté correctement
        this.zone.run(() => {
          this.onTypeActiviteChange(value);
          // Force detection de changement après mise à jour
          this.cdr.detectChanges();
        });
      }
    });
  }  private patchFormWithActivite(activite: Activite): void {
    console.log('Patching form with activity:', activite);
    
    // Extraire les valeurs à patcher dans le formulaire
    const formValues: any = {
      titre: activite.titre,
      description: activite.description,
      type_activite_id: activite.type_activite_id,
      duree: activite.duree,
      seance_id: this.seanceId || (activite as any).seance_id || 0
    };

    // Initialiser le contenu en fonction du type d'activité
    if (activite.contenu) {
      let parsedContent: any;
      
      // Tenter de parser le contenu comme JSON ou l'utiliser tel quel
      try {
        parsedContent = typeof activite.contenu === 'string'
          ? JSON.parse(activite.contenu)
          : activite.contenu;
        
        console.log('Parsed content:', parsedContent);
      } catch (error) {
        // Si le contenu n'est pas du JSON valide, on le considère comme du texte simple
        console.log('Content is not valid JSON, treating as text:', activite.contenu);
        parsedContent = {
          type: 'texte',
          contenu: activite.contenu
        };
      }

      // Déterminer le type d'activité
      const activiteType = this.typesActivite.find(type => type.id === Number(activite.type_activite_id));
      const typeStr = activiteType ? activiteType.type_activite : '';
      console.log('Activity type from database:', typeStr);

      // Initialiser le formulaire en fonction du type déterminé
      if (this.isTypeOf(typeStr, 'video') || this.isTypeOf(typeStr, 'vidéo')) {
        // Traitement d'une activité vidéo
        if (parsedContent.lien) {
          formValues.lien_video = parsedContent.lien;        } else if (typeof activite.contenu === 'string' && !parsedContent.type) {
          // Si c'est une chaîne simple, la traiter comme un lien vidéo
          formValues.lien_video = activite.contenu;
        }
      } else if (this.isTypeOf(typeStr, 'qcm') || this.isTypeOf(typeStr, 'quiz')) {
        // Traitement d'un QCM
        const questionsArray = this.activiteForm.get('questions') as FormArray;
        
        // Réinitialiser le FormArray
        while (questionsArray && questionsArray.length > 0) {
          questionsArray.removeAt(0);
        }
        
        // Utiliser le service QcmUtils pour convertir le format API en format formulaire
        const formattedQcmData = this.qcmUtilsService.convertApiToFormFormat(activite.contenu);
        console.log('Formatted QCM data for form:', formattedQcmData);
        
        // Vérifier si nous avons des questions structurées
        if (formattedQcmData.questions && Array.isArray(formattedQcmData.questions)) {
          formattedQcmData.questions.forEach((q: any) => {
            const questionGroup = this.fb.group({
              texte: [q.texte, [Validators.required]],
              options: this.fb.array([]),
              reponse_correcte: [q.reponse_correcte || 0, [Validators.required]]
            });
            
            // Ajouter les options
            const optionsArray = questionGroup.get('options') as FormArray;
            if (q.options && Array.isArray(q.options)) {
              q.options.forEach((opt: string) => {
                optionsArray.push(this.fb.control(opt, [Validators.required]));
              });
            } else {
              // Ajouter une option par défaut si nécessaire
              optionsArray.push(this.fb.control('', [Validators.required]));
            }
            
            questionsArray.push(questionGroup);
          });
        } else {
          // Ajouter une question vide par défaut
          const questionGroup = this.fb.group({
            texte: ['', [Validators.required]],
            options: this.fb.array([
              this.fb.control('', [Validators.required])
            ]),
            reponse_correcte: [0, [Validators.required]]
          });
          questionsArray.push(questionGroup);
        }
      } else if (this.isTypeOf(typeStr, 'question') || this.isTypeOf(typeStr, 'question-reponse')) {
        // Traitement des questions-réponses
        const questionsArray = this.activiteForm.get('questions') as FormArray;
        
        // Réinitialiser le FormArray
        while (questionsArray && questionsArray.length > 0) {
          questionsArray.removeAt(0);
        }
        
        // Vérifier si nous avons des questions structurées
        if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
          parsedContent.questions.forEach((q: any) => {
            const questionGroup = this.fb.group({
              texte: [q.texte, [Validators.required]]
            });
            questionsArray.push(questionGroup);
          });
        } else {
          // Ajouter une question vide par défaut
          const questionGroup = this.fb.group({
            texte: ['', [Validators.required]]
          });
          questionsArray.push(questionGroup);
        }
      } else {
        // Pour tous les autres types (texte, etc.)
        if (parsedContent.contenu) {
          formValues.contenu = parsedContent.contenu;
        } else if (typeof activite.contenu === 'string') {
          // Si c'est une chaîne simple, l'utiliser comme contenu
          formValues.contenu = activite.contenu;
        }
      }
    }

    // Patcher le formulaire
    this.activiteForm.patchValue(formValues);
    
    // Déclencher manuellement le changement de type pour mettre à jour l'UI
    if (activite.type_activite_id) {
      this.onTypeActiviteChange(Number(activite.type_activite_id));
    }
    
    console.log('Form patched successfully');
  }

  private loadSeances(): void {
    this.seanceService.getAllSeances().subscribe(
      response => {
        this.seances = response.seances;
        console.log('Séances chargées:', this.seances);
      },
      error => {
        console.error('Erreur lors du chargement des séances:', error);
      }
    );
  }
  private initForm(): void {
    this.activiteForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      type_activite_id: ['', Validators.required],
      ordre: [0],
      duree: [null],
      
      // Champ seance_id facultatif avec la nouvelle relation many-to-many
      seance_id: [this.seanceId],
      
      // Champs spécifiques au type d'activité
      // Ces champs seront masqués/affichés en fonction du type sélectionné
      lien_video: [''],
      questions: this.fb.array([]),
      
      // Contenu générique pour les types simples
      contenu: ['']
    });

    // Ajouter les validateurs conditionnels
    this.activiteForm.get('type_activite_id')?.valueChanges.subscribe(typeId => {
      const type = this.typesActivite.find(t => t.id === Number(typeId));
      if (type) {
        this.selectedType = type.type_activite;
        this.updateValidators();
      }
    });
  }

  private loadTypesActivite(): void {
    this.isLoading = true;
    this.activiteService.getTypeActivites().subscribe(
      response => {
        this.typesActivite = response.typeActivites;
        console.log('Types d\'activités chargés:', this.typesActivite);
        this.isLoading = false;
      },
      error => {
        console.error('Erreur lors du chargement des types d\'activité:', error);
        this.isLoading = false;
      }
    );
  }
  onTypeActiviteChange(typeId: number): void {
    const selectedType = this.typesActivite.find(type => type.id === +typeId);
    
    if (selectedType) {
      this.selectedType = selectedType.type_activite;
      console.log('Type sélectionné:', this.selectedType);
      
      // Réinitialiser les validateurs en fonction du type sélectionné
      this.updateValidators();
      
      // Force detection de changement
      this.cdr.detectChanges();
    }
  }

  private updateValidators(): void {
    const lienVideoControl = this.activiteForm.get('lien_video');
    const contenuControl = this.activiteForm.get('contenu');
    const questionsControl = this.activiteForm.get('questions');

    // Réinitialiser les validateurs
    lienVideoControl?.clearValidators();
    contenuControl?.clearValidators();
    questionsControl?.clearValidators();
    
    // Appliquer les validateurs en fonction du type
    if (this.isVideoType) {
      lienVideoControl?.setValidators([Validators.required]);
    } else if (this.isQcmType || this.isQuestionReponseType) {
      questionsControl?.setValidators([Validators.required]);
    } else if (this.isTexteType) {
      contenuControl?.setValidators([Validators.required]);
    }
    
    // Mettre à jour les validateurs
    lienVideoControl?.updateValueAndValidity();
    contenuControl?.updateValueAndValidity();
    questionsControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.activiteForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.activiteForm.controls).forEach(key => {
        this.activiteForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValues = this.activiteForm.value;
    let contenuStructure: any;

    // Construire le contenu en fonction du type d'activité
    if (this.isVideoType) {
      contenuStructure = {
        type: 'video',
        lien: formValues.lien_video,
        description: formValues.description || ''
      };
    } else if (this.isQcmType) {
      // Utiliser le service QcmUtils pour valider et standardiser la structure QCM
      const qcmFormData = {
        questions: formValues.questions.map((q: any) => ({
          texte: q.texte,
          options: q.options,
          reponse_correcte: parseInt(q.reponse_correcte, 10)
        }))
      };
      
      contenuStructure = this.qcmUtilsService.convertFormToApiFormat(qcmFormData);
      console.log('QCM structure validée:', contenuStructure);
    } else if (this.isQuestionReponseType) {
      contenuStructure = {
        type: 'question_reponse',
        questions: formValues.questions.map((q: any) => ({ texte: q.texte }))
      };
    } else {
      // Pour les types texte ou autres types
      contenuStructure = {
        type: 'texte',
        contenu: formValues.contenu || ''
      };
    }

    // Créer l'objet d'activité à envoyer
    const activiteData: any = {
      titre: formValues.titre,
      description: formValues.description,
      type_activite_id: Number(formValues.type_activite_id),
      seance_id: Number(formValues.seance_id),
      ordre: formValues.ordre || 0,
      duree: formValues.duree ? Number(formValues.duree) : null,
      contenu: JSON.stringify(contenuStructure) // Convertir en JSON une seule fois
    };

    console.log('Données d\'activité à envoyer (FORMAT FINAL):', activiteData);

    this.isLoading = true;    // Si nous éditons une activité existante
    if (this.activiteToEdit && this.activiteToEdit.id) {
      this.activiteService.updateActivite(Number(this.activiteToEdit.id), activiteData).subscribe({
        next: (response) => {
          console.log('Réponse du serveur (mise à jour):', response);
          this.activiteUpdated.emit(response.activite);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour de l\'activité:', error);
          this.isLoading = false;
        }
      });
    } else {
      // Si nous créons une nouvelle activité
      this.activiteService.createActivite(activiteData).subscribe({
        next: (response) => {
          console.log('Réponse du serveur (création):', response);
          this.activiteCreated.emit(response.activite);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la création de l\'activité:', error);
          this.isLoading = false;
        }
      });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  // Méthode pour vérifier si un type correspond à une catégorie
  isTypeOf(type: string | null, category: string): boolean {
    if (!type) return false;
    
    // Normaliser en minuscules, sans accents et sans espaces
    const normalizeText = (text: string) => {
      return text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_\s]/g, "");
    };
    
    const normalizedType = normalizeText(type);
    const normalizedCategory = normalizeText(category);
    
    return normalizedType.includes(normalizedCategory) || 
           normalizedCategory.includes(normalizedType);
  }
  
  // Getters pour simplifier les conditions dans le template
  get isVideoType(): boolean {
    return this.isTypeOf(this.selectedType, 'video') || this.isTypeOf(this.selectedType, 'vidéo');
  }
  
  get isQcmType(): boolean {
    return this.isTypeOf(this.selectedType, 'qcm') || this.isTypeOf(this.selectedType, 'quizz') || this.isTypeOf(this.selectedType, 'quiz');
  }
  
  get isQuestionReponseType(): boolean {
    return this.isTypeOf(this.selectedType, 'question') || this.isTypeOf(this.selectedType, 'question-reponse');
  }
  
  get isTexteType(): boolean {
    return this.isTypeOf(this.selectedType, 'texte') || this.isTypeOf(this.selectedType, 'text');
  }
}