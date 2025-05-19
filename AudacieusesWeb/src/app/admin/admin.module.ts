import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { ModuleClientsComponent } from './pages/module-clients/module-clients.component';
import { ClientsComponent } from './pages/clients/clients.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UserModuleDetailComponent } from './pages/user-module-detail/user-module-detail.component';
import { HelpComponent } from '../shared/pages/help/help.component';

@NgModule({
  declarations: [
    // Si le composant n'est pas standalone, déclarez-le ici
    // AdminComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    // Si le composant est standalone, importez-le ici
    AdminComponent,
    ModuleClientsComponent,
    ClientsComponent,
    UserModuleDetailComponent,
    HelpComponent
  ]
})
export class AdminModule { }
