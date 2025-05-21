import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientDashboardComponent } from './pages/dashboard/dashboard.component';
import { ModulesListComponent } from './pages/modules/modules-list.component';
import { ModuleDetailComponent } from './pages/modules/module-detail.component';
import { SeanceDetailComponent } from './pages/seances/seance-detail.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ClientComponent } from './client.component';

const routes: Routes = [
  {
    path: '',
    component: ClientComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ClientDashboardComponent },
      { path: 'modules', component: ModulesListComponent },
      { path: 'modules/:id', component: ModuleDetailComponent },
      { path: 'seances/:id', component: SeanceDetailComponent },
      { path: 'profile', component: ProfileComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientRoutingModule { }
