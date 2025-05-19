import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { ActiviteFormComponent } from './activite-form.component';
import { QcmFormComponent } from './qcm-form/qcm-form.component';
import { QuestionReponseFormComponent } from './question-reponse-form/question-reponse-form.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ActiviteFormComponent,
    QcmFormComponent,
    QuestionReponseFormComponent
  ],
  exports: [
    ActiviteFormComponent
  ]
})
export class ActiviteFormModule { } 