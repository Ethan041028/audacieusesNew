import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ActiviteService {
  private apiUrl = `${environment.apiUrl}/activites`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Récupérer toutes les activités
  getAllActivites(): Observable<any> {
    return this.http.get(`${this.apiUrl}`);
  }

  // Récupérer une activité par son ID
  getActiviteById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Récupérer les activités d'une séance
  getActivitesBySeance(seanceId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/seance/${seanceId}`);
  }

  // Créer une nouvelle activité
  createActivite(activiteData: any): Observable<any> {
    console.log('URL API pour la création d\'activité:', `${this.apiUrl}`);
    
    // Préparer les données au format exact attendu par le backend
    const dataToSend: any = {
      titre: activiteData.titre,
      description: activiteData.description || '',
      type_activite_id: activiteData.type_activite_id,
      ordre: activiteData.ordre || 0,
      duree: activiteData.duree || null,
      contenu: activiteData.contenu
    };
    
    // Ajouter l'ID de séance si spécifié (facultatif avec la nouvelle relation many-to-many)
    if (activiteData.seance_id) {
      dataToSend.seance_id = activiteData.seance_id;
    }
    
    // Ajouter les champs spécifiques si nécessaire
    if (activiteData.lien_video) {
      dataToSend.lien_video = activiteData.lien_video;
    }
    
    if (activiteData.questions) {
      dataToSend.questions = activiteData.questions;
    }

    console.log('Données finales envoyées à l\'API:', dataToSend);
    
    // Créer les en-têtes avec le token d'authentification
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    console.log('En-têtes de la requête:', headers);
    
    // Toujours utiliser l'URL complète du backend
    return this.http.post(`${this.apiUrl}`, dataToSend, { 
      headers, 
      withCredentials: true 
    }).pipe(
      catchError(error => {
        console.error('Erreur détaillée lors de la création d\'activité:', error);
        console.error('Erreur détaillée lors de la création d\'activité:', error);
        return throwError(() => error);
      })
    );
  }

  // Mettre à jour une activité
  updateActivite(id: number, activiteData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, activiteData);
  }

  // Supprimer une activité
  deleteActivite(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Récupérer tous les types d'activités
  getTypeActivites(): Observable<any> {
    return this.http.get(`${this.apiUrl}/types`);
  }

  // Réordonner les activités d'une séance
  reorderActivites(seanceId: number, ordre: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/seance/${seanceId}/reorder`, { ordre });
  }

  // Enregistrer une réponse à une question
  saveQuestionResponse(activiteId: number, userId: number, reponse: string): Observable<any> {
    // Logs pour débugger
    console.log(`Envoi de réponse pour activité ${activiteId}, utilisateur ${userId}`);
    console.log('Contenu de la réponse:', reponse);
    console.log('Type de la réponse:', typeof reponse);
    
    // Vérification des types et conversion si nécessaire
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      console.error('ID utilisateur invalide:', userId);
      return throwError(() => new Error('ID utilisateur invalide'));
    }
    
    // Vérification et nettoyage de la réponse
    let cleanedReponse = reponse;
    if (typeof reponse !== 'string') {
      console.warn('Réponse n\'est pas une chaîne, conversion...');
      cleanedReponse = JSON.stringify(reponse);
    }
    
    // Création des données à envoyer
    const dataToSend = { 
      user_id: userIdNumber,
      reponse: cleanedReponse
    };
    
    console.log('Données complètes envoyées à l\'API:', dataToSend);
    
    // Créer les en-têtes avec le token d'authentification
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.post(`${this.apiUrl}/${activiteId}/reponses`, dataToSend, {
      headers,
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error(`Erreur lors de l'enregistrement de la réponse pour activité ${activiteId}:`, error);
        if (error.error) {
          console.error('Détails de l\'erreur:', error.error);
        }
        return throwError(() => error);
      })
    );
  }

  // Récupérer les réponses d'un utilisateur pour une activité
  getUserResponsesForActivite(activiteId: number, userId: number): Observable<any> {
    console.log(`Récupération des réponses pour activité ${activiteId}, utilisateur ${userId}`);
    
    // Vérification des types
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber)) {
      console.error('ID utilisateur invalide:', userId);
      return throwError(() => new Error('ID utilisateur invalide'));
    }
    
    // Créer les en-têtes avec le token d'authentification
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get(`${this.apiUrl}/${activiteId}/reponses/${userIdNumber}`, { headers }).pipe(
      map((response: any) => {
        console.log('Réponse brute de l\'API:', response);
        
        // Si la réponse est null, retourner un objet standard vide
        if (!response || !response.reponse) {
          console.log(`Aucune réponse trouvée pour l'activité ${activiteId}, utilisateur ${userId}`);
          return { 
            reponse: { 
              contenu: null,
              reponse: null 
            } 
          };
        }
        
        // Adapter la réponse pour traiter les différentes structures possibles
        const reponseObj = response.reponse;
          
        // Création d'un objet de réponse standardisé
        return {
          reponse: {
            ...reponseObj,
            // Si contenu existe l'utiliser, sinon utiliser reponse s'il existe
            reponse: reponseObj.contenu 
          }
        };
      }),
      catchError(error => {
        // Si c'est une erreur 404, ne pas propager l'erreur mais retourner un objet vide
        if (error.status === 404) {
          console.log(`Erreur 404 traitée comme absence de réponse pour activité ${activiteId}, utilisateur ${userId}`);
          return of({ 
            reponse: { 
              contenu: null,
              reponse: null 
            } 
          });
        }
        console.error('Erreur lors de la récupération des réponses pour activité:', error);
        return throwError(() => error);
      })
    );
  }

  // Ajouter une activité à une séance
  addActiviteToSeance(seanceId: number, activiteId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/seance/${seanceId}/add/${activiteId}`, {});
  }

  // Retirer une activité d'une séance
  removeActiviteFromSeance(seanceId: number, activiteId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/seance/${seanceId}/remove/${activiteId}`);
  }
}
