import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';

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
    private router: Router,
    private socketService: SocketService
  ) {
    // Récupérer l'utilisateur stocké dans le localStorage au démarrage
    this.currentUserSubject = new BehaviorSubject<any>(this.getUserFromStorage());
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Vérifier et rafraîchir le token si nécessaire
    this.checkTokenExpiration();
    
    // Initialiser la connexion Socket.IO si l'utilisateur est déjà connecté
    if (this.currentUserValue) {
      this.initSocketConnection(this.currentUserValue.user.id);
    }
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
            
            // Initialiser la connexion Socket.IO après l'inscription réussie
            if (response.user && response.user.id) {
              this.initSocketConnection(response.user.id);
            }
          }
        }),
        catchError(this.handleError)
      );
  }

  // Connexion d'un utilisateur
  login(credentials: { mail: string; mdp: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response && response.token) {
            this.storeUserData(response);
            
            // Établir la connexion Socket.IO après la connexion
            if (response.user && response.user.id) {
              this.initSocketConnection(response.user.id);
            }
          }
        }),
        catchError(this.handleError)
      );
  }

  // Déconnexion
  logout(): void {
    // Déconnecter Socket.IO
    this.socketService.disconnect();
    
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.router.navigate(['/auth/login']);
  }

  // Demande de réinitialisation de mot de passe
  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { mail: email })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Réinitialisation de mot de passe avec token
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, { token, mdp: newPassword })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Rafraîchir le token
  refreshToken(): Observable<any> {
    // Si pas d'utilisateur connecté, retourner une erreur
    if (!this.currentUserValue) {
      return throwError(() => new Error('Aucun utilisateur connecté'));
    }

    return this.http.post<any>(`${this.apiUrl}/refresh-token`, {
      refreshToken: this.currentUserValue.refreshToken
    }).pipe(
      tap(response => {
        if (response && response.token) {
          // Mettre à jour uniquement le token et sa date d'expiration
          const updatedUser = {
            ...this.currentUserValue,
            token: response.token,
            refreshToken: response.refreshToken
          };
          this.storeUserData(updatedUser);
        }
      }),
      catchError(error => {
        // En cas d'erreur, déconnecter l'utilisateur
        this.logout();
        return throwError(() => error);
      })
    );
  }

  // Stocker les données utilisateur dans le localStorage
  private storeUserData(userData: any): void {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    this.currentUserSubject.next(userData);
    
    // Configurer l'expiration automatique du token
    this.autoLogout(this.getTokenExpirationDate(userData.token));
  }

  // Obtenir la date d'expiration d'un token JWT
  private getTokenExpirationDate(token: string): Date | null {
    if (!token) return null;

    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      if (!decoded.exp) return null;

      const expirationDate = new Date(0);
      expirationDate.setUTCSeconds(decoded.exp);
      return expirationDate;
    } catch (e) {
      return null;
    }
  }

  // Configurer la déconnexion automatique à l'expiration du token
  private autoLogout(expirationDate: Date | null): void {
    if (!expirationDate) return;

    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    const expiresIn = expirationDate.getTime() - Date.now();
    if (expiresIn <= 0) {
      this.logout();
      return;
    }

    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expiresIn);
  }

  // Vérifier l'expiration du token au démarrage de l'application
  private checkTokenExpiration(): void {
    if (this.currentUserValue && this.currentUserValue.token) {
      const expirationDate = this.getTokenExpirationDate(this.currentUserValue.token);
      
      if (expirationDate && expirationDate > new Date()) {
        // Token valide, configurer la déconnexion automatique
        this.autoLogout(expirationDate);
      } else {
        // Token expiré, essayer de le rafraîchir
        this.refreshToken().subscribe({
          error: () => this.logout()
        });
      }
    }
  }

  // Initialiser la connexion Socket.IO
  private initSocketConnection(userId: number): void {
    if (userId) {
      this.socketService.connect(userId);
    }
  }

  // Gestion des erreurs HTTP
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else if (error.status) {
      // Erreur renvoyée par le serveur
      errorMessage = error.error.message || error.statusText;
    }
    
    return throwError(() => ({ error: errorMessage, status: error.status }));
  }
}