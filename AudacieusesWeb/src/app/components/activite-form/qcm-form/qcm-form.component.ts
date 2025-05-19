import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormArray, FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-qcm-form',
  templateUrl: './qcm-form.component.html',
  styleUrls: ['./qcm-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class QcmFormComponent implements OnInit {
  @Input() parentForm!: FormGroup;
  
  get questionsArray(): FormArray {
    return this.parentForm.get('questions') as FormArray;
  }
  
  constructor(private fb: FormBuilder) { }
    ngOnInit(): void {
    // Vérifier si le FormArray existe déjà dans le formulaire parent
    if (!this.parentForm.contains('questions')) {
      this.parentForm.addControl('questions', this.fb.array([]));
    }
    
    // Ajouter une question par défaut si aucune n'existe
    if (this.questionsArray.length === 0) {
      this.addQuestion();
    } else {
      console.log('QCM form initialized with existing questions:', this.questionsArray.length);
    }
  }
  
  addQuestion(): void {
    const questionGroup = this.fb.group({
      texte: ['', [Validators.required]],
      options: this.fb.array([
        this.fb.control('', [Validators.required])
      ]),
      reponse_correcte: [0, [Validators.required]]
    });
    
    this.questionsArray.push(questionGroup);
  }
  
  removeQuestion(index: number): void {
    if (this.questionsArray.length > 1) {
      this.questionsArray.removeAt(index);
    }
  }
  
  addOption(questionIndex: number): void {
    const options = this.getOptionsArray(questionIndex);
    options.push(this.fb.control('', [Validators.required]));
  }
  
  removeOption(questionIndex: number, optionIndex: number): void {
    const options = this.getOptionsArray(questionIndex);
    if (options.length > 1) {
      options.removeAt(optionIndex);
      
      // Mettre à jour la réponse correcte si nécessaire
      const questionGroup = this.questionsArray.at(questionIndex) as FormGroup;
      const reponseCorrecte = questionGroup.get('reponse_correcte')?.value;
      
      if (reponseCorrecte === optionIndex) {
        questionGroup.get('reponse_correcte')?.setValue(0);
      } else if (reponseCorrecte > optionIndex) {
        questionGroup.get('reponse_correcte')?.setValue(reponseCorrecte - 1);
      }
    }
  }
  
  getOptionsArray(questionIndex: number): FormArray {
    return (this.questionsArray.at(questionIndex) as FormGroup).get('options') as FormArray;
  }

  setCorrectAnswer(questionIndex: number, optionIndex: number): void {
    const questionGroup = this.questionsArray.at(questionIndex) as FormGroup;
    questionGroup.get('reponse_correcte')?.setValue(optionIndex);
  }
  
  isCorrectAnswer(questionIndex: number, optionIndex: number): boolean {
    const questionGroup = this.questionsArray.at(questionIndex) as FormGroup;
    return questionGroup.get('reponse_correcte')?.value === optionIndex;
  }
} 