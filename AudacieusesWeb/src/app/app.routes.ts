import { Routes } from '@angular/router';
import { adminGuard, clientGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Routes d'authentification
  { 
    path: '', 
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  
  // Routes admin protégées
  { 
    path: 'admin', 
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    canActivate: [adminGuard]
  },
  
  // Routes client protégées
  { 
    path: 'client', 
    loadChildren: () => import('./client/client.module').then(m => m.ClientModule),
    canActivate: [clientGuard]
  },
  
  // Redirection par défaut vers la page d'accueil
  { 
    path: '**', 
    redirectTo: '' 
  },
];
