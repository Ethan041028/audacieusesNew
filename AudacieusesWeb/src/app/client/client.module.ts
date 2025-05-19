import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientRoutingModule } from './client-routing.module';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ClientComponent } from './client.component';
import { ClientCalendrierComponent } from './pages/calendrier/calendrier.component';
import { RappelsComponent } from './pages/calendrier/rappels.component';
import { ModulesListComponent } from './pages/modules/modules-list.component';
import { ModuleDetailComponent } from './pages/modules/module-detail.component';
import { SeanceDetailComponent } from './pages/seances/seance-detail.component';
import { QuestionActiviteComponent } from './components/question-activite/question-activite.component';
import { VideoActiviteComponent } from './components/video-activite/video-activite.component';
import { TextActiviteComponent } from './components/text-activite/text-activite.component';
import { DocumentActiviteComponent } from './components/document-activite/document-activite.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { HelpComponent } from '../shared/pages/help/help.component';

@NgModule({
  imports: [
    CommonModule,
    ClientRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    FullCalendarModule,
    NgbModule,
    
    // Importation des composants standalone
    ClientComponent,
    ClientCalendrierComponent,
    RappelsComponent,
    ModulesListComponent,
    ModuleDetailComponent,
    SeanceDetailComponent,
    QuestionActiviteComponent,
    VideoActiviteComponent,
    TextActiviteComponent,
    DocumentActiviteComponent,
    ProfileComponent,
    HelpComponent
  ],
  providers: [
    {
      provide: 'ModalService',
      useExisting: NgbModal
    }
  ]
})
export class ClientModule { }
