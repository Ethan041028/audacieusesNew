import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ActiviteService } from './activite.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ActivityCompletionService {
  private activityProgressMap = new Map<number, any>();
  private activityCompletedSource = new BehaviorSubject<number | null>(null);
  
  activityCompleted$ = this.activityCompletedSource.asObservable();
  
  constructor(
    private activiteService: ActiviteService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  /**
   * Marque une activité comme terminée et met également à jour le suivi de la séance associée
   * @param activiteId ID de l'activité
   * @param extraData Données supplémentaires à enregistrer
   */
  markActivityAsCompleted(activiteId: number, extraData: any = {}): Observable<any> {
    const userId = this.authService.currentUserValue?.user?.id;
    if (!userId) {
      this.notificationService.showError('Utilisateur non connecté');
      throw new Error('User not authenticated');
    }
    
    return this.activiteService.getActiviteById(activiteId).pipe(
      switchMap(activiteData => {
        const activite = activiteData.activite;
        const activityType = activite.typeActivite?.type_activite || '';
        
        // Préparer les données de progression pour la réponse
        const progressData = {
          completed: true,
          completedAt: new Date().toISOString(),
          type: activityType,
          ...extraData
        };
        
        console.log(`Activité ${activiteId} de type ${progressData.type}`);
        
        // Afficher les séances associées à cette activité (pour débogage)
        console.log('Séances associées à cette activité:', activite.seances);
        
        // POUR TOUTES LES ACTIVITÉS: Stocker les données en cache local
        this.activityProgressMap.set(activiteId, progressData);
        this.activityCompletedSource.next(activiteId);
        
        // Pour toutes les activités, tenter de sauvegarder une réponse
        return this.saveQuestionResponse(activiteId, userId, progressData);
      }),
      catchError(err => {
        console.error(`Erreur lors de la récupération ou traitement de l'activité ${activiteId}:`, err);
        
        // Message d'erreur plus spécifique basé sur le type d'erreur
        if (err.status === 404) {
          this.notificationService.showError(`Activité ${activiteId} non trouvée`);
        } else if (err.status === 400) {
          this.notificationService.showError(`Erreur de format: ${err.error?.message || 'Format de réponse incorrect'}`);
        } else {
          this.notificationService.showError('Une erreur est survenue lors du traitement de votre réponse');
        }
        
        throw err;
      })
    );
  }
  
  /**
   * Enregistre une réponse pour une activité de type question
   * @private
   */
  private saveQuestionResponse(activiteId: number, userId: number, progressData: any): Observable<any> {
    return new Observable(observer => {
      // Assurer que progressData est sérialisé comme JSON si ce n'est pas déjà une chaîne
      const dataToSend = typeof progressData === 'string' 
        ? progressData 
        : JSON.stringify(progressData);
      
      console.log(`Envoi de la réponse pour l'activité ${activiteId} - Utilisateur ${userId}:`, progressData);
      
      this.activiteService.saveQuestionResponse(activiteId, userId, dataToSend).subscribe({
        next: (response) => {
          console.log(`Réponse enregistrée avec succès pour l'activité ${activiteId}:`, response);
          
          // Stocker la progression dans le cache
          this.activityProgressMap.set(activiteId, progressData);
          
          // Notifier les observateurs
          this.activityCompletedSource.next(activiteId);
          
          observer.next(response);
          observer.complete();
        },
        error: (err) => {
          console.error(`Erreur lors de l'enregistrement de la réponse pour l'activité ${activiteId}:`, err);
          this.notificationService.showError('Erreur lors de l\'enregistrement de la progression');
          observer.error(err);
        }
      });
    });
  }
  
  /**
   * Récupère la progression d'une activité
   * @param activiteId ID de l'activité
   */
  getActivityProgress(activiteId: number): Observable<any> {
    // Si nous avons déjà les données en cache, les utiliser
    if (this.activityProgressMap.has(activiteId)) {
      return new Observable(observer => {
        observer.next(this.activityProgressMap.get(activiteId));
        observer.complete();
      });
    }
    
    // Sinon, faire une requête au serveur
    const userId = this.authService.currentUserValue?.user?.id;
    if (!userId) {
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }
    
    return new Observable(observer => {
      // D'abord, récupérer l'activité pour connaître son type
      this.activiteService.getActiviteById(activiteId).subscribe({
        next: (activiteData: any) => {
          const activite = activiteData.activite;
            
          // Pour toutes les activités, récupérer les réponses depuis l'API
          this.activiteService.getUserResponsesForActivite(activiteId, userId).subscribe({
            next: (response: any) => {
              console.log('Réponse reçue dans ActivityCompletionService:', response);
              
              if (response && response.reponse) {
                try {
                  // Détecter le champ de contenu (peut être 'reponse' ou 'contenu')
                  let contentString = null;
                    
                  if (typeof response.reponse.reponse === 'string') {
                    contentString = response.reponse.reponse;
                  } else if (typeof response.reponse.contenu === 'string') {
                    contentString = response.reponse.contenu;
                  }
                    
                  // Essayer de parser la chaîne JSON
                  let progress = null;
                    
                  if (contentString) {
                    try {
                      progress = JSON.parse(contentString);
                    } catch {
                      // Si ce n'est pas un JSON, utiliser la chaîne brute
                      progress = contentString;
                    }
                  } else {
                    // Si pas de chaîne trouvée, utiliser l'objet tel quel
                    progress = response.reponse.reponse || response.reponse.contenu || response.reponse;
                  }
                    
                  // Mettre en cache les données
                  this.activityProgressMap.set(activiteId, progress);
                    
                  observer.next(progress);
                } catch (e) {
                  console.error('Erreur lors du parsing de la réponse:', e, response);
                  observer.next(null);
                }
              } else {
                observer.next(null);
              }
              observer.complete();
            },
            error: (err: any) => {
              console.error('Erreur lors de la récupération des réponses:', err);
              observer.next(null);
              observer.complete();
            }
          });
        },
        error: (err: any) => {
          console.error(`Erreur lors de la récupération de l'activité ${activiteId}:`, err);
          observer.next(null);
          observer.complete();
        }
      });
    });
  }
  
  /**
   * Vérifie si une activité est terminée
   * @param activiteId ID de l'activité
   */
  isActivityCompleted(activiteId: number): Observable<boolean> {
    return new Observable(observer => {
      this.getActivityProgress(activiteId).subscribe((progress: any) => {
        observer.next(progress && progress.completed === true);
        observer.complete();
      });
    });
  }
  
  /**
   * Réinitialise le cache de progression pour une activité
   * @param activiteId ID de l'activité
   */
  resetActivityProgress(activiteId: number): void {
    this.activityProgressMap.delete(activiteId);
  }
  
  /**
   * Réinitialise tout le cache de progression
   */
  resetAllProgress(): void {
    this.activityProgressMap.clear();
  }
}
