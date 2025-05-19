import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private apiUrl = `${environment.apiUrl}/modules`;

  constructor(private http: HttpClient) { }

  // Récupérer les modules assignés à un utilisateur
  getUserModules(userId: number): Observable<any> {
    console.log(`Appel API pour récupérer les modules de l'utilisateur ${userId}`);
    return this.http.get<any>(`${this.apiUrl}/user/${userId}`)
      .pipe(
        map(response => {
          console.log('Réponse brute de getUserModules:', response);
          if (response.modules) {
            console.log(`Nombre de modules reçus: ${response.modules.length}`);
            response.modules.forEach((module: any) => {
              console.log(`Module ${module.id} - Titre: ${module.titre}`);
              
              if (module.progression) {
                // Forcer la conversion du pourcentage en nombre si nécessaire
                if (typeof module.progression.percentage === 'string') {
                  module.progression.percentage = Number(module.progression.percentage);
                }
                
                console.log(`Module ${module.id} - Détails de progression:`, {
                  percentage: module.progression.percentage,
                  status: module.progression.status,
                  completed: module.progression.completed,
                  total: module.progression.total,
                  date_completion: module.progression.date_completion,
                  date_mise_a_jour: module.progression.date_mise_a_jour
                });
              } else {
                console.warn(`Module ${module.id} - Pas de données de progression!`);
              }
            });
          } else {
            console.warn('Aucun module reçu dans la réponse');
          }
          return response;
        }),
        catchError(error => {
          console.error('Erreur lors de la récupération des modules:', error);
          return this.handleError(error);
        })
      );
  }

  // Récupérer un module par son ID
  getModuleById(id: number): Observable<any> {
    console.log(`Appel API pour récupérer le module ID: ${id}`);
    return this.http.get<any>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => {
          console.log(`Réponse pour le module ${id}:`, response);
          
          // Si la réponse contient des informations de progression, les loguer
          if (response.progression) {
            // Forcer la conversion du pourcentage en nombre si nécessaire
            if (typeof response.progression.percentage === 'string') {
              response.progression.percentage = Number(response.progression.percentage);
            }
            
            console.log(`Module ${id} - Progression:`, response.progression);
          } else if (response.module && response.module.progression) {
            // Forcer la conversion du pourcentage en nombre si nécessaire
            if (typeof response.module.progression.percentage === 'string') {
              response.module.progression.percentage = Number(response.module.progression.percentage);
            }
            
            console.log(`Module ${id} - Progression:`, response.module.progression);
          }
          
          return response;
        }),
        catchError(this.handleError)
      );
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
    
    console.error('ModuleService Error:', errorMessage, error);
    return throwError(() => ({ error: errorMessage, status: error.status }));
  }
}