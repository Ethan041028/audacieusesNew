import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EvenementService {
  private apiUrl = `${environment.apiUrl}/evenements`;

  constructor(private http: HttpClient) { }

  /**
   * Récupère tous les événements (admin uniquement)
   * @returns Observable avec tous les événements
   */
  getAllEvenements(): Observable<any> {
    return this.http.get(`${this.apiUrl}/all`).pipe(
      map((response: any) => response.evenements)
    );
  }

  /**
   * Récupère les événements de l'utilisateur connecté
   * @returns Observable avec les événements de l'utilisateur
   */
  getUserEvenements(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`);
  }

  /**
   * Récupère les événements d'un utilisateur spécifique (admin uniquement)
   * @param userId ID de l'utilisateur
   * @returns Observable avec les événements de l'utilisateur
   */
  getEvenementsByUserId(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/${userId}`);
  }

  /**
   * Récupère les rappels à venir pour l'utilisateur connecté
   * @returns Observable avec les rappels à venir
   */
  getUserRappels(): Observable<any> {
    return this.http.get(`${this.apiUrl}/rappels`).pipe(
      map((response: any) => response.rappels)
    );
  }

  /**
   * Récupère un événement spécifique par son ID
   * @param id ID de l'événement
   * @returns Observable avec l'événement demandé
   */
  getEvenementById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`).pipe(
      map((response: any) => response.evenement)
    );
  }

  /**
   * Crée un nouvel événement
   * @param evenementData Données de l'événement à créer
   * @returns Observable avec l'événement créé
   */
  createEvenement(evenementData: any): Observable<any> {
    return this.http.post(this.apiUrl, evenementData).pipe(
      map((response: any) => response.evenement)
    );
  }

  /**
   * Met à jour un événement existant
   * @param id ID de l'événement à mettre à jour
   * @param evenementData Nouvelles données de l'événement
   * @returns Observable avec l'événement mis à jour
   */
  updateEvenement(id: number, evenementData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, evenementData).pipe(
      map((response: any) => response.evenement)
    );
  }

  /**
   * Supprime un événement existant
   * @param id ID de l'événement à supprimer
   * @returns Observable avec le message de confirmation
   */
  deleteEvenement(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Convertit les événements au format FullCalendar
   * @param events Liste des événements à convertir
   * @returns Événements au format FullCalendar
   */
  formatEventsForCalendar(events: any[]): any[] {
    if (!events) return [];
    
    return events.map(event => ({
      id: event.id,
      title: event.titre,
      start: event.date_debut,
      end: event.date_fin,
      backgroundColor: event.couleur,
      borderColor: event.couleur,
      allDay: this.isAllDayEvent(event.date_debut, event.date_fin),
      extendedProps: {
        description: event.description,
        lieu: event.lieu,
        type: event.type,
        statut: event.statut,
        createur: event.createur,
        participants: event.participants,
        seance: event.seance,
        rappel: event.rappel,
        temps_rappel: event.temps_rappel,
        prive: event.prive
      }
    }));
  }

  /**
   * Détermine si un événement dure toute la journée
   * @param startDate Date de début
   * @param endDate Date de fin
   * @returns true si l'événement dure toute la journée, false sinon
   */
  private isAllDayEvent(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Vérifier si les heures/minutes sont 00:00 et 23:59
    const isStartMidnight = start.getHours() === 0 && start.getMinutes() === 0;
    const isEndNearMidnight = end.getHours() === 23 && end.getMinutes() === 59;
    
    // Vérifier si l'événement dure au moins 1 jour entier
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const duration = end.getTime() - start.getTime();
    
    return (isStartMidnight && isEndNearMidnight) || duration >= oneDayInMs;
  }
}