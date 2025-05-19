import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private apiUrl = `${environment.apiUrl}/modules`;

  constructor(private http: HttpClient, private notificationService: NotificationService) { }

  // Méthode de logging pour débugger
  private logging(...args: any[]): void {
    if (!environment.production) {
      console.log(...args);
    }
  }

  // Récupérer tous les modules
  getAllModules(options: { 
    page?: number, 
    limit?: number, 
    search?: string, 
    status?: string,
    sortBy?: string, 
    sortOrder?: 'asc' | 'desc',
    debug?: string,
    noFilter?: string
  } = {}): Observable<any> {
    let params = new HttpParams();
    
    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.search) params = params.set('search', options.search);
    if (options.status) params = params.set('statut', options.status);
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.sortOrder) params = params.set('sortOrder', options.sortOrder);
    if (options.debug) params = params.set('debug', options.debug);
    if (options.noFilter) params = params.set('noFilter', options.noFilter);
    
    console.log('MODULE SERVICE - Envoi requête API:', `${this.apiUrl}`, { params });
    
    return this.http.get<any>(this.apiUrl, { params })
      .pipe(
        tap(response => {
          console.log('MODULE SERVICE - Réponse brute reçue:', response);
          console.log('MODULE SERVICE - Nombre de modules:', response?.modules?.length || 0);
          if (response?.modules?.length > 0) {
            // Log détaillé des modules reçus
            console.log('MODULE SERVICE - Détail des modules reçus:');
            response.modules.forEach((module: any, index: number) => {
              console.log(`MODULE SERVICE - Module ${index + 1}:`, { 
                id: module.id, 
                titre: module.titre, 
                statut: module.statut,
                modules_users: module.modules_users ? 'présent' : 'absent'
              });
            });
          }
        }),
        catchError(this.handleError)
      );
  }

  // Récupérer les modules assignés à un utilisateur
  getUserModules(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/user/${userId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Récupérer un module par son ID
  getModuleById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }
  
  // Récupérer les activités et réponses d'un utilisateur pour un module
  getUserModuleActivites(userId: number, moduleId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${moduleId}/user/${userId}/activites`)
      .pipe(
        tap(response => this.logging('Activités utilisateur reçues:', response)),
        catchError(error => {
          this.notificationService.showError('Erreur lors de la récupération des activités');
          return throwError(() => error);
        })
      );
  }

  // Créer un nouveau module
  createModule(moduleData: any): Observable<any> {
    // Si moduleData est de type FormData, envoyez-le directement
    // sinon, créez un FormData (pour garantir la compatibilité avec les anciens appels)
    if (!(moduleData instanceof FormData)) {
      const formData = new FormData();
      Object.keys(moduleData).forEach(key => {
        // Pour les tableaux ou objets, convertir en JSON
        if (typeof moduleData[key] === 'object' && !(moduleData[key] instanceof File)) {
          formData.append(key, JSON.stringify(moduleData[key]));
        } else {
          formData.append(key, moduleData[key]);
        }
      });
      moduleData = formData;
    }
    
    // Ajouter le created_by avec l'ID de l'utilisateur depuis le localStorage si nécessaire
    if (!moduleData.has('created_by')) {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser && currentUser.user && currentUser.user.id) {
          moduleData.append('created_by', currentUser.user.id);
        }
      } catch (e) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', e);
      }
    }
    
    // Journaliser les clés du FormData pour débogage
    console.log('Clés du FormData:', 
      Array.from((moduleData as FormData).keys()).map(key => `${key}`).join(', '));
    
    return this.http.post<any>(this.apiUrl, moduleData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Mettre à jour un module
  updateModule(id: number, moduleData: any): Observable<any> {
    // Si moduleData est de type FormData, envoyez-le directement
    // sinon, créez un FormData (pour garantir la compatibilité avec les anciens appels)
    if (!(moduleData instanceof FormData)) {
      const formData = new FormData();
      Object.keys(moduleData).forEach(key => {
        // Pour les tableaux ou objets, convertir en JSON
        if (typeof moduleData[key] === 'object' && !(moduleData[key] instanceof File)) {
          formData.append(key, JSON.stringify(moduleData[key]));
        } else {
          formData.append(key, moduleData[key]);
        }
      });
      moduleData = formData;
    }
    
    // Journaliser les clés du FormData pour débogage
    console.log('Clés du FormData pour mise à jour:', 
      Array.from((moduleData as FormData).keys()).map(key => `${key}`).join(', '));
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, moduleData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Supprimer un module
  deleteModule(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Attribuer un module à un utilisateur
  assignModuleToUser(moduleId: number, userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${moduleId}/assign/${userId}`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  // Retirer un module à un utilisateur
  removeModuleFromUser(moduleId: number, userId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${moduleId}/assign/${userId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Récupérer les séances d'un module
  getModuleSeances(moduleId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${moduleId}/seances`)
      .pipe(
        catchError(this.handleError)
      );
  }  // Ajouter des séances à un module
  addSeancesToModule(moduleId: number, seanceIds: number[]): Observable<any> {
    this.logging('MODULE SERVICE - Ajout de séances au module:', moduleId, 'IDs des séances:', seanceIds);
    return this.http.post<any>(`${this.apiUrl}/${moduleId}/seances`, { seanceIds })
      .pipe(
        tap(response => this.logging('Séances ajoutées au module avec succès', response)),
        catchError(error => {
          this.notificationService.showError('Erreur lors de l\'ajout des séances au module');
          return throwError(() => error);
        })
      );
  }

  // Supprimer une séance d'un module
  removeSeanceFromModule(moduleId: number, seanceId: number): Observable<any> {
    this.logging('MODULE SERVICE - Suppression de la séance du module:', moduleId, 'ID de la séance:', seanceId);
    return this.http.delete<any>(`${this.apiUrl}/${moduleId}/seances/${seanceId}`)
      .pipe(
        tap(response => this.logging('Séance supprimée du module avec succès', response)),
        catchError(error => {
          this.notificationService.showError('Erreur lors de la suppression de la séance du module');
          return throwError(() => error);
        })
      );
  }

  // Changer le statut d'un module
  changeModuleStatus(id: number, statut: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { statut })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Réinitialiser la progression d'un module pour un utilisateur
  resetUserModuleProgress(moduleId: number, userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${moduleId}/reset-progress/${userId}`, {})
      .pipe(
        tap(response => this.logging('Progression du module réinitialisée avec succès', response)),
        catchError(error => {
          this.notificationService.showError('Erreur lors de la réinitialisation de la progression du module');
          return throwError(() => error);
        })
      );
  }

  // Gestion des erreurs HTTP
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    
    console.error('Erreur HTTP détaillée:', error);
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else if (error.status) {
      // Erreur renvoyée par le serveur
      try {
        if (error.status === 400) {
          console.log('Erreur 400 - Détails:', error.error);
          
          if (error.error && Array.isArray(error.error.errors)) {
            // Traiter les erreurs de validation express-validator
            errorMessage = error.error.errors.map((e: any) => e.msg || e.message).join(', ');
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else {
            errorMessage = `Requête invalide (${error.status})`;
          }
        } else if (error.status === 401) {
          errorMessage = 'Non autorisé: veuillez vous reconnecter';
        } else if (error.status === 403) {
          errorMessage = 'Accès refusé: vous n\'avez pas les droits nécessaires';
        } else if (error.status === 404) {
          errorMessage = 'Ressource non trouvée';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur: veuillez réessayer plus tard';
        } else {
          if (typeof error.error === 'string') {
            errorMessage = error.error || error.statusText;
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else {
            errorMessage = error.statusText || `Erreur ${error.status}`;
          }
        }
      } catch (e) {
        console.error('Erreur pendant le traitement de l\'erreur:', e);
        errorMessage = `Erreur ${error.status}: ${error.statusText}`;
      }
    }
    
    console.log('Message d\'erreur final:', errorMessage);
    return throwError(() => ({ error: errorMessage, status: error.status, details: error.error }));
  }
}
