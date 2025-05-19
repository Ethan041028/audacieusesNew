import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { SeancesComponent } from './seances.component';
import { SeanceService } from '../../../services/seance.service';
import { NotificationService } from '../../../services/notification.service';
import { ModuleService } from '../../services/module.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule
  ],
  providers: [
    SeanceService,
    NotificationService,
    ModuleService
  ]
})
export class SeancesModule { } 