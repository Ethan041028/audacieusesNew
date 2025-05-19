import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Garde pour les utilisateurs non connectés (accès à la page de connexion)
export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Si l'utilisateur est déjà connecté
  if (authService.isLoggedIn()) {
    // Rediriger vers la page appropriée selon le rôle
    if (authService.isAdmin()) {
      router.navigate(['/admin/dashboard']);
    } else if (authService.isClient()) {
      router.navigate(['/client/dashboard']);
    } else {
      router.navigate(['/']);
    }
    return false;
  }
  
  // Autoriser l'accès si l'utilisateur n'est pas connecté
  return true;
};

// Garde pour les routes administratives
export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // Vérifier que l'utilisateur est connecté
  if (!authService.isLoggedIn()) {
    // Rediriger vers la page de connexion avec l'URL de retour
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  // Vérifier que l'utilisateur est un admin
  if (!authService.isAdmin()) {
    // Si l'utilisateur est connecté mais n'est pas un admin
    router.navigate(['/']);
    return false;
  }
  
  // Autoriser l'accès
  return true;
};

// Garde pour les routes client
export const clientGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // Vérifier que l'utilisateur est connecté
  if (!authService.isLoggedIn()) {
    // Rediriger vers la page de connexion avec l'URL de retour
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  // Vérifier que l'utilisateur est un client
  if (!authService.isClient()) {
    // Si l'utilisateur est connecté mais n'est pas un client
    if (authService.isAdmin()) {
      router.navigate(['/admin/dashboard']);
    } else {
      router.navigate(['/']);
    }
    return false;
  }
  
  // Autoriser l'accès
  return true;
};

// Garde pour l'accès aux rôles Admin+
export const adminPlusGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // Vérifier que l'utilisateur est connecté
  if (!authService.isLoggedIn()) {
    // Rediriger vers la page de connexion avec l'URL de retour
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  // Vérifier que l'utilisateur est un admin+
  if (!authService.isAdminPlus()) {
    // Si l'utilisateur est connecté mais n'est pas un admin+
    if (authService.isAdmin()) {
      router.navigate(['/admin/dashboard']);
    } else if (authService.isClient()) {
      router.navigate(['/client/dashboard']);
    } else {
      router.navigate(['/']);
    }
    return false;
  }
  
  // Autoriser l'accès
  return true;
};