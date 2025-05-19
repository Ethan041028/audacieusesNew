import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

// Subject pour suivre l'état de rafraîchissement du token
const refreshTokenSubject = new BehaviorSubject<any>(null);
let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Injecter le service d'authentification
  const authService = inject(AuthService);
  
  // Si la requête est destinée à une API externe, ne pas ajouter le token
  if (isExternalRequest(request.url, authService)) {
    return next(request);
  }

  // Récupérer le token JWT depuis le service d'authentification
  const token = authService.getToken();

  // Si un token existe, l'ajouter en tant qu'en-tête d'autorisation
  if (token) {
    request = addToken(request, token);
  }

  // Gérer la réponse et intercepter les erreurs potentielles
  return next(request).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Si l'erreur est de type 401 (non autorisé), tenter de rafraîchir le token
        return handle401Error(request, next, authService);
      } else {
        // Pour les autres erreurs, les propager normalement
        return throwError(() => error);
      }
    })
  );
};

// Fonction pour ajouter le token à la requête
function addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Fonction pour gérer les erreurs 401
function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  // Si le rafraîchissement n'est pas en cours, initier le processus
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap(response => {
        isRefreshing = false;
        refreshTokenSubject.next(response.token);
        return next(addToken(request, response.token));
      }),
      catchError(error => {
        isRefreshing = false;
        
        // Si le rafraîchissement échoue, déconnecter l'utilisateur
        authService.logout();
        return throwError(() => error);
      }),
      finalize(() => {
        isRefreshing = false;
      })
    );
  } else {
    // Si un rafraîchissement est déjà en cours, attendre qu'il se termine
    return refreshTokenSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(token => {
        return next(addToken(request, token));
      })
    );
  }
}

// Fonction pour vérifier si c'est une requête externe
function isExternalRequest(url: string, authService: AuthService): boolean {
  // Vérifier si l'URL ne fait pas partie de notre API
  const apiUrl = authService.getApiUrl();
  return !url.startsWith(apiUrl);
}