import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  private tokenExpirationTimer: any;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Récupérer l'utilisateur stocké dans le localStorage au démarrage
    this.currentUserSubject = new BehaviorSubject<any>(this.getUserFromStorage());
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Vérifier et rafraîchir le token si nécessaire
    this.checkTokenExpiration();
  }

  // Getter pour accéder à l'utilisateur courant
  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  // Récupérer l'utilisateur du localStorage
  private getUserFromStorage(): any {
    const user = localStorage.getItem('currentUser');
    if (user) {
      try {
        return JSON.parse(user);
      } catch (e) {
        localStorage.removeItem('currentUser');
        return null;
      }
    }
    return null;
  }

  // Vérifier si l'utilisateur est connecté
  public isLoggedIn(): boolean {
    return !!this.currentUserValue && !!this.currentUserValue.token;
  }

  // Vérifier si l'utilisateur est un admin
  public isAdmin(): boolean {
    if (!this.isLoggedIn()) return false;
    
    const userRole = this.currentUserValue.user.role;
    
    // Vérifier selon tous les formats possibles
    if (typeof userRole === 'string') {
      // Si le rôle est directement une chaîne
      return userRole === 'admin' || userRole === 'admin_plus';
    } else if (userRole && typeof userRole === 'object') {
      // Si le rôle est un objet
      return (
        // Nom du rôle
        userRole.nom === 'admin' || userRole.nom === 'admin_plus' ||
        // Type de rôle 
        userRole.role_type === 'admin' || userRole.role_type === 'admin_plus' ||
        // Si le type contient admin
        (typeof userRole.role_type === 'string' && 
         (userRole.role_type.includes('admin')))
      );
    }
    
    return false;
  }

  // Vérifier si l'utilisateur est un admin+
  public isAdminPlus(): boolean {
    if (!this.isLoggedIn()) return false;
    
    const userRole = this.currentUserValue.user.role;
    
    // Vérifier selon tous les formats possibles
    if (typeof userRole === 'string') {
      // Si le rôle est directement une chaîne
      return userRole === 'admin_plus';
    } else if (userRole && typeof userRole === 'object') {
      // Si le rôle est un objet
      return (
        userRole.nom === 'admin_plus' || 
        userRole.role_type === 'admin_plus' ||
        (typeof userRole.role_type === 'string' && userRole.role_type.includes('admin_plus'))
      );
    }
    
    return false;
  }

  // Vérifier si l'utilisateur est un client
  public isClient(): boolean {
    console.log('Vérification isClient, utilisateur courant:', this.currentUserValue);
    const isLoggedIn = this.isLoggedIn();
    console.log('Est connecté:', isLoggedIn);
    
    if (!isLoggedIn) return false;
    
    // Vérifier le rôle selon tous les formats possibles
    const userRole = this.currentUserValue.user.role;
    
    // Analyser tous les formats possibles dans lesquels le rôle peut être reçu
    let hasClientRole = false;
    
    if (typeof userRole === 'string') {
      // Si le rôle est directement une chaîne
      hasClientRole = userRole === 'client';
    } else if (userRole && typeof userRole === 'object') {
      // Si le rôle est un objet (format habituel de l'API)
      hasClientRole = 
        // Vérification directe du nom du rôle
        userRole.nom === 'client' || 
        // Vérification du type de rôle (parfois nom est utilisé comme type)
        userRole.role_type === 'client' ||
        // Vérification si le type de rôle contient le mot "client"
        (typeof userRole.role_type === 'string' && userRole.role_type.includes('client'));
    }
    
    // Log détaillé pour le débogage
    console.log('Analyse du rôle:', {
      roleTypeof: typeof userRole,
      roleValue: userRole,
      roleNom: userRole?.nom,
      roleType: userRole?.role_type
    });
    
    console.log('Est client:', hasClientRole);
    return hasClientRole;
  }

  // Obtenir le token JWT pour l'intercepteur
  public getToken(): string | null {
    return this.currentUserValue ? this.currentUserValue.token : null;
  }

  // Obtenir l'URL de base de l'API
  public getApiUrl(): string {
    return environment.apiUrl;
  }

  // Mettre à jour les données de l'utilisateur actuel
  updateCurrentUserData(userData: any): void {
    if (this.currentUserValue) {
      const updatedUserData = {
        ...this.currentUserValue,
        user: {
          ...this.currentUserValue.user,
          ...userData
        }
      };
      
      localStorage.setItem('currentUser', JSON.stringify(updatedUserData));
      this.currentUserSubject.next(updatedUserData);
    }
  }
  
  // Changer le mot de passe
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/change-password`, { currentPassword, newPassword })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Inscription d'un nouvel utilisateur
  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData)
      .pipe(
        tap(response => {
          console.log('Réponse d\'inscription reçue:', response);
          if (response && response.token) {
            this.storeUserData(response);
            console.log('Données utilisateur stockées après inscription:', this.currentUserValue);
          }
        }),
        catchError(this.handleError)
      );
  }

  // Connexion
  login(credentials: { mail: string; mdp: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response && response.token) {
            this.storeUserData(response);
          }
        }),
        catchError(this.handleError)
      );
  }

  // Déconnexion
  logout(): void {
    // Supprimer l'utilisateur du localStorage
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    
    // Arrêter le timer d'expiration
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    
    // Rediriger vers la page de connexion
    this.router.navigate(['/auth/login']);
  }

  // Mot de passe oublié
  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  // Réinitialisation du mot de passe
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, { token, newPassword })
      .pipe(catchError(this.handleError));
  }

  // Rafraîchir le token
  refreshToken(): Observable<any> {
    if (!this.currentUserValue || !this.currentUserValue.token) {
      return throwError(() => new Error('Pas de token à rafraîchir'));
    }

    return this.http.post<any>(`${this.apiUrl}/refresh-token`, {
      token: this.currentUserValue.token
    }).pipe(
      tap(response => {
        if (response && response.token) {
          this.storeUserData(response);
        }
      }),
      catchError(error => {
        // En cas d'erreur de rafraîchissement, déconnecter l'utilisateur
        this.logout();
        return throwError(() => error);
      })
    );
  }

  // Stocker les données utilisateur
  private storeUserData(userData: any): void {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    this.currentUserSubject.next(userData);
    
    // Configurer l'expiration automatique du token
    const expirationDate = this.getTokenExpirationDate(userData.token);
    this.autoLogout(expirationDate);
  }

  // Obtenir la date d'expiration du token
  private getTokenExpirationDate(token: string): Date | null {
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      if (tokenData.exp) {
        return new Date(tokenData.exp * 1000);
      }
      return null;
    } catch (e) {
      console.error('Erreur lors du décodage du token:', e);
      return null;
    }
  }

  // Déconnexion automatique à l'expiration du token
  private autoLogout(expirationDate: Date | null): void {
    if (!expirationDate) return;

    const now = new Date().getTime();
    const expirationTime = expirationDate.getTime();
    const timeUntilExpiration = expirationTime - now;

    // Si le token est déjà expiré, déconnecter immédiatement
    if (timeUntilExpiration <= 0) {
      this.logout();
      return;
    }

    // Sinon, programmer la déconnexion automatique
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, timeUntilExpiration);
  }

  // Vérifier l'expiration du token
  private checkTokenExpiration(): void {
    if (!this.currentUserValue || !this.currentUserValue.token) return;

    const expirationDate = this.getTokenExpirationDate(this.currentUserValue.token);
    if (!expirationDate) return;

    const now = new Date().getTime();
    const expirationTime = expirationDate.getTime();
    const timeUntilExpiration = expirationTime - now;

    // Si le token expire dans moins de 5 minutes, le rafraîchir
    if (timeUntilExpiration > 0 && timeUntilExpiration < 5 * 60 * 1000) {
      this.refreshToken().subscribe();
    }
  }

  // Gestion des erreurs
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = error.error.message;
    } else {
      // Erreur côté serveur
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.status === 401) {
        errorMessage = 'Identifiants invalides';
      } else if (error.status === 403) {
        errorMessage = 'Accès non autorisé';
      } else if (error.status === 404) {
        errorMessage = 'Ressource non trouvée';
      }
    }
    
    console.error('Erreur:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}