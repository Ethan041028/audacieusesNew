import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: {
    id: number;
    role_type: string;
    nom: string;
  };
  date_creation: string;
  status: string;
  progression?: number;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  pays?: string;
  date_naissance?: string;
  derniere_connexion?: string;
}

export interface UsersResponse {
  users: User[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  private adminApiUrl = `${environment.apiUrl}/admin`;
  private moduleApiUrl = `${environment.apiUrl}/modules`;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) { }

  /**
   * Récupère tous les utilisateurs avec pagination et filtres
   */
  getAllUsers(options: { 
    page?: number, 
    limit?: number, 
    search?: string, 
    role?: string,
    status?: string,
    sortBy?: string, 
    sortOrder?: 'asc' | 'desc' 
  } = {}): Observable<UsersResponse> {
    let params = new HttpParams();
    
    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.search) params = params.set('search', options.search);
    if (options.role) params = params.set('role', options.role);
    if (options.status) params = params.set('status', options.status);
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.sortOrder) params = params.set('sortOrder', options.sortOrder);
    
    return this.http.get<UsersResponse>(this.apiUrl, { params })
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Récupère un utilisateur par son ID
   */
  getUserById(id: number): Observable<{user: User}> {
    return this.http.get<{user: User}>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Crée un nouvel utilisateur
   */
  createUser(userData: Partial<User>): Observable<{user: User, message: string}> {
    return this.http.post<{user: User, message: string}>(this.apiUrl, userData)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Met à jour un utilisateur
   */
  updateUser(id: number, userData: Partial<User>): Observable<{user: User, message: string}> {
    return this.http.put<{user: User, message: string}>(`${this.apiUrl}/${id}`, userData)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Supprime un utilisateur
   */
  deleteUser(id: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError.bind(this)));
  }
  
  /**
   * Change le statut d'un utilisateur (actif/inactif)
   */
  changeUserStatus(id: number, status: string): Observable<{user: User, message: string}> {
    return this.http.patch<{user: User, message: string}>(`${this.apiUrl}/${id}/status`, { status })
      .pipe(catchError(this.handleError.bind(this)));
  }
  
  /**
   * Change le rôle d'un utilisateur
   */
  changeUserRole(id: number, roleId: number): Observable<{user: User, message: string}> {
    return this.http.patch<{user: User, message: string}>(`${this.apiUrl}/${id}/role`, { roleId })
      .pipe(catchError(this.handleError.bind(this)));
  }
  
  /**
   * Récupère les statistiques utilisateurs pour l'admin
   */
  getUserStats(): Observable<any> {
    return this.http.get<any>(`${this.adminApiUrl}/user-stats`)
      .pipe(catchError(this.handleError.bind(this)));
  }
  
  /**
   * Récupère l'historique d'activité d'un utilisateur
   */
  getUserActivity(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/activity`)
      .pipe(catchError(this.handleError.bind(this)));
  }
  
  /**
   * Récupère les modules assignés à un utilisateur
   */
  getUserModules(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/modules`)
      .pipe(catchError(this.handleError.bind(this)));
  }
  
  /**
   * Récupère les utilisateurs associés à un module spécifique
   */
  getUsersByModule(moduleId: number): Observable<any> {
    return this.http.get<any>(`${this.moduleApiUrl}/${moduleId}/users`)
      .pipe(catchError(this.handleError.bind(this)));
  }
    
  /**
   * Réinitialise le mot de passe d'un utilisateur (admin uniquement)
   */
  resetUserPassword(id: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/${id}/reset-password`, {})
      .pipe(catchError(this.handleError.bind(this)));
  }
  
  /**
   * Met à jour l'avatar d'un utilisateur
   */
  updateUserAvatar(id: number, formData: FormData): Observable<{user: User, message: string}> {
    return this.http.post<{user: User, message: string}>(`${this.apiUrl}/${id}/avatar`, formData)
      .pipe(catchError(this.handleError.bind(this)));
  }

  // Gestion des erreurs HTTP
  private handleError(error: any): Observable<never> {
    console.error('Erreur dans le service UserService:', error);
    
    let errorMessage = 'Une erreur est survenue lors de la communication avec le serveur';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else if (error.status) {
      // Erreur renvoyée par le serveur
      switch (error.status) {
        case 400:
          errorMessage = 'Requête invalide';
          break;
        case 401:
          errorMessage = 'Non autorisé: veuillez vous reconnecter';
          break;
        case 403:
          errorMessage = 'Accès refusé: vous n\'avez pas les droits nécessaires';
          break;
        case 404:
          errorMessage = 'Utilisateur non trouvé';
          break;
        case 500:
          errorMessage = 'Erreur serveur: veuillez réessayer plus tard';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.statusText}`;
      }
    }
    
    this.notificationService.showError(errorMessage);
    return throwError(() => ({ error: errorMessage, status: error.status }));
  }
}
