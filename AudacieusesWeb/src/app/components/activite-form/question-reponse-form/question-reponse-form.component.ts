import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormArray, FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-question-reponse-form',
  templateUrl: './question-reponse-form.component.html',
  styleUrls: ['./question-reponse-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class QuestionReponseFormComponent implements OnInit {
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
      console.log('Question-Reponse form initialized with existing questions:', this.questionsArray.length);
    }
  }
  
  addQuestion(): void {
    const questionGroup = this.fb.group({
      texte: ['', [Validators.required]]
    });
    
    this.questionsArray.push(questionGroup);
  }
  
  removeQuestion(index: number): void {
    if (this.questionsArray.length > 1) {
      this.questionsArray.removeAt(index);
    }
  }
} 