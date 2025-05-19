import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientDashboardComponent } from './pages/dashboard/dashboard.component';
import { ModulesListComponent } from './pages/modules/modules-list.component';
import { ModuleDetailComponent } from './pages/modules/module-detail.component';
import { SeanceDetailComponent } from './pages/seances/seance-detail.component';
import { RessourcesComponent } from './pages/ressources/ressources.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ClientComponent } from './client.component';
import { HelpComponent } from '../shared/pages/help/help.component';

const routes: Routes = [
  {
    path: '', component: ClientComponent, // Composant parent
    children: [
      { path: 'dashboard', component: ClientDashboardComponent },
      { path: 'ressources', component: RessourcesComponent },
      { path: 'modules', component: ModulesListComponent },
      { path: 'modules/:id', component: ModuleDetailComponent },
      { path: 'seances/:id', component: SeanceDetailComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'help', component: HelpComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' } // Redirection par défaut
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientRoutingModule { }
