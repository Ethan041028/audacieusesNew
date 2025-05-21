import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClientRoutingModule } from './client-routing.module';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ClientComponent } from './client.component';
import { ModulesListComponent } from './pages/modules/modules-list.component';
import { ModuleDetailComponent } from './pages/modules/module-detail.component';
import { SeanceDetailComponent } from './pages/seances/seance-detail.component';
import { QuestionActiviteComponent } from './components/question-activite/question-activite.component';
import { VideoActiviteComponent } from './components/video-activite/video-activite.component';
import { TextActiviteComponent } from './components/text-activite/text-activite.component';
import { DocumentActiviteComponent } from './components/document-activite/document-activite.component';
import { ProfileComponent } from './pages/profile/profile.component';

@NgModule({
  imports: [
    CommonModule,
    ClientRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    NgbModule,
    
    // Importation des composants standalone
    ClientComponent,
    ModulesListComponent,
    ModuleDetailComponent,
    SeanceDetailComponent,
    QuestionActiviteComponent,
    VideoActiviteComponent,
    TextActiviteComponent,
    DocumentActiviteComponent,
    ProfileComponent
  ],
  providers: [
    {
      provide: 'ModalService',
      useExisting: NgbModal
    }
  ]
})
export class ClientModule { }
