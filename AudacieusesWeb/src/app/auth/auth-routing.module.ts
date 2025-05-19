import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { HomeComponent } from './pages/home/home.component';
import { loginGuard } from '../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    data: { animation: 'home' },
    title: 'Les Audacieuses'
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard],
    data: { animation: 'login' },
    title: 'Connexion - Les Audacieuses'
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [loginGuard],
    data: { animation: 'register' },
    title: 'Inscription - Les Audacieuses'
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    data: { animation: 'forgot-password' },
    title: 'Mot de passe oublié - Les Audacieuses'
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    data: { animation: 'reset-password' },
    title: 'Réinitialisation du mot de passe - Les Audacieuses'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }