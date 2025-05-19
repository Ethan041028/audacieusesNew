import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ActivityCompletionService } from './activity-completion.service';

// Interface pour le map des statuts
interface StatusMap {
  [key: string]: number;
}

@Injectable({
  providedIn: 'root'
})
export class SeanceProgressionService {
  private apiUrl = `${environment.apiUrl}/seances`;

  // Map des statuts vers leurs IDs
  private statusMap: StatusMap = {
    'NON_COMMENCE': 1,
    'EN_COURS': 2,
    'TERMINE': 3,
    'REPORTE': 4
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private notificationService: NotificationService,
    private activityCompletionService: ActivityCompletionService
  ) { }

  /**
   * Met à jour la progression d'une séance pour l'utilisateur courant
   * @param seanceId ID de la séance
   * @param progression Pourcentage de progression (0-100)
   * @param statut Statut du suivi ('NON_COMMENCE', 'EN_COURS', 'TERMINE', etc.)
   */
  updateSuivi(seanceId: number, progression: number, statut: string): Observable<any> {
    const userId = this.authService.currentUserValue?.user?.id;
    if (!userId) {
      console.error('Aucun utilisateur connecté');
      return of({ error: 'Utilisateur non connecté' });
    }

    // Convertir le statut en status_id
    const status_id = this.statusMap[statut] || 1; // Default à NON_COMMENCE si statut inconnu

    const suiviData = {
      progression: progression,
      status_id: status_id
    };

    console.log(`Mise à jour du suivi pour la séance ${seanceId} avec:`, suiviData);
    console.log(`Conversion statut "${statut}" vers status_id: ${status_id}`);

    // Appel à l'API pour mettre à jour le suivi
    return this.http.put(`${this.apiUrl}/${seanceId}/suivi`, suiviData).pipe(
      map(response => {
        console.log(`Suivi mis à jour pour la séance ${seanceId}:`, response);
        return response;
      }),
      catchError(error => {
        console.error(`Erreur lors de la mise à jour du suivi pour la séance ${seanceId}:`, error);
        this.notificationService.showError('Erreur lors de la mise à jour de la progression');
        throw error;
      })
    );
  }

  /**
   * Marque une séance comme terminée
   * @param seanceId ID de la séance
   */
  markSeanceAsCompleted(seanceId: number): Observable<any> {
    console.log(`Marquage de la séance ${seanceId} comme terminée`);
    return this.updateSuivi(seanceId, 100, 'TERMINE');
  }

  /**
   * Met à jour le suivi d'une séance en fonction des activités terminées
   * @param seanceId ID de la séance
   * @param activites Liste des activités de la séance
   */
  updateSeanceProgressionFromActivities(seanceId: number, activites: any[]): Observable<any> {
    if (!activites || activites.length === 0) {
      return of({ success: false, message: 'Aucune activité associée à cette séance' });
    }

    console.log(`Calcul de la progression pour la séance ${seanceId} avec ${activites.length} activités`);

    // Vérifier l'état de complétion de chaque activité
    const completionChecks = activites.map(activite => 
      this.activityCompletionService.isActivityCompleted(activite.id)
    );

    // Vérifier toutes les activités complétées
    return new Observable(observer => {
      Promise.all(completionChecks.map(check => check.toPromise()))
        .then(results => {
          // Compter les activités terminées
          const completedCount = results.filter(Boolean).length;
          const totalCount = activites.length;
          
          // Calculer le pourcentage de progression
          const progressPercentage = Math.round((completedCount / totalCount) * 100);
          
          console.log(`Séance ${seanceId} - Progression: ${completedCount}/${totalCount} activités (${progressPercentage}%)`);
          
          // Déterminer le statut
          let statut = 'NON_COMMENCE';
          if (progressPercentage === 100) {
            statut = 'TERMINE';
          } else if (progressPercentage > 0) {
            statut = 'EN_COURS';
          }
          
          // Mettre à jour le suivi dans la base de données
          this.updateSuivi(seanceId, progressPercentage, statut).subscribe({
            next: response => {
              observer.next({
                success: true,
                progression: progressPercentage,
                statut: statut,
                response
              });
              observer.complete();
            },
            error: err => {
              observer.error(err);
            }
          });
        })
        .catch(error => {
          console.error(`Erreur lors de la vérification des activités pour la séance ${seanceId}:`, error);
          observer.error(error);
        });
    });
  }
} 