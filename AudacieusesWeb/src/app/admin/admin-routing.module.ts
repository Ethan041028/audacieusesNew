import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AdminDashboardComponent } from './pages/dashboard/dashboard.component';
import { UsersComponent } from './pages/users/users.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { ModulesComponent } from './pages/modules/modules.component';
import { UserModulesComponent } from './pages/user-modules/user-modules.component';
import { UserModuleDetailComponent } from './pages/user-module-detail/user-module-detail.component';
import { ModuleClientsComponent } from './pages/module-clients/module-clients.component';
import { SeancesComponent } from './pages/seances/seances.component';
import { ActivitesComponent } from './pages/activites/activites.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { HelpComponent } from '../shared/pages/help/help.component';

// TODO: Ajouter les guards auth et admin si nécessaire
// import { authGuard } from '../guards/auth.guard';
// import { adminGuard } from '../guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    // TODO: Ajouter les guards si nécessaire
    // canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: UsersComponent },
      { path: 'users/:id', component: UserProfileComponent },
      { path: 'users/:id/modules', component: UserModulesComponent },
      { path: 'users/:userId/modules/:moduleId/detail', component: UserModuleDetailComponent },
      { path: 'modules', component: ModulesComponent },
      { path: 'modules/:id/clients', component: ModuleClientsComponent },
      { path: 'seances', component: SeancesComponent },
      { path: 'activites', component: ActivitesComponent},
      { path: 'profile', component: ProfileComponent },
      { path: 'help', component: HelpComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
