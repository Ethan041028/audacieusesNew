import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Seance {
  id: number;
  titre: string;
  description: string;
  contenu: string;
  duree: number;
  ordre: number;
  type: string;
  statut: string;
  date_creation: string;
  date_modification: string;
  created_by: number;
  image_url?: string; // Ajout de la propriété image_url comme optionnelle
  activites?: any[]; // Ajout de la propriété activites pour stocker les activités liées
  modules?: number[]; // Liste des IDs de modules associés via module_seance
  suivi?: {
    id: number;
    user_id: number;
    seance_id: number;
    statut: string;
    progression: number;
    date_debut: string;
    date_fin: string;
  };
}

export interface SeancesResponse {
  seances: Seance[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class SeanceService {
  private apiUrl = `${environment.apiUrl}/seances`;

  constructor(private http: HttpClient) { }

  /**
   * Récupère toutes les séances
   * @returns Observable avec toutes les séances
   */
  getAllSeances(): Observable<SeancesResponse> {
    return this.http.get<SeancesResponse>(`${this.apiUrl}`);
  }

  /**
   * Récupère une séance par son ID
   * @param id ID de la séance
   * @returns Observable avec la séance
   */
  getSeanceById(id: number): Observable<{seance: Seance}> {
    return this.http.get<{seance: Seance}>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère les séances d'un module
   * @param moduleId ID du module
   * @returns Observable avec les séances du module
   */
  getSeancesByModule(moduleId: number): Observable<SeancesResponse> {
    return this.http.get<SeancesResponse>(`${this.apiUrl}/module/${moduleId}`);
  }

  /**
   * Crée une nouvelle séance
   * @param seanceData Données de la séance
   * @returns Observable avec la séance créée
   */
  createSeance(seanceData: Partial<Seance>): Observable<{seance: Seance, message: string}> {
    // Créer un objet minimal sans module_id pour éviter le conflit avec la table module_seance
    const payload: any = {
      titre: seanceData.titre || 'Nouvelle séance',
      description: seanceData.description || '',
      contenu: seanceData.contenu || '',
      duree: 60, // Valeur par défaut
      type: seanceData.type || 'individuelle',
      created_by: 1, // Valeur par défaut
      statut: seanceData.statut || 'brouillon',
      ordre: 0
    };

    // Traiter les champs numériques
    if (seanceData.duree) {
      const dureeNum = parseInt(String(seanceData.duree), 10);
      if (!isNaN(dureeNum) && dureeNum > 0) {
        payload.duree = dureeNum;
      }
    }

    if (seanceData.created_by) {
      const createdByNum = parseInt(String(seanceData.created_by), 10);
      if (!isNaN(createdByNum) && createdByNum > 0) {
        payload.created_by = createdByNum;
      }
    }

    // Traiter les modules
    if (seanceData.modules && seanceData.modules.length > 0) {
      payload.modules = seanceData.modules.map(id => 
        typeof id === 'string' ? parseInt(id, 10) : id
      ).filter(id => !isNaN(id) && id > 0);
    }
    
    console.log('Service - Données à envoyer (structure finale):', payload);
    console.log('Service - Valeurs critiques:', {
      duree: payload.duree + ' (' + typeof payload.duree + ')',
      created_by: payload.created_by + ' (' + typeof payload.created_by + ')',
      modules: JSON.stringify(payload.modules || [])
    });
    
    // Création de la requête avec en-têtes spécifiques
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json');
    
    return this.http.post<{seance: Seance, message: string}>(
      this.apiUrl, 
      payload, 
      { headers }
    ).pipe(
      tap({
        next: response => console.log('Service - Réponse reçue:', response),
        error: error => {
          console.error('Service - Erreur de requête:', error);
          if (error.error) {
            console.error('Service - Détail de l\'erreur:', error.error);
            console.error('Service - Corps de la requête:', payload);
          }
        }
      })
    );
  }

  /**
   * Met à jour une séance
   * @param id ID de la séance
   * @param seanceData Données à mettre à jour
   * @returns Observable avec la séance mise à jour
   */
  updateSeance(id: number, seanceData: Partial<Seance>): Observable<{seance: Seance, message: string}> {
    // Préparer un nouvel objet avec les données validées
    const payload: any = {};
    
    // Copier uniquement les propriétés fournies
    if (seanceData.titre !== undefined) payload.titre = seanceData.titre;
    if (seanceData.description !== undefined) payload.description = seanceData.description;
    if (seanceData.contenu !== undefined) payload.contenu = seanceData.contenu;
    if (seanceData.statut !== undefined) payload.statut = seanceData.statut;
    if (seanceData.type !== undefined) payload.type = seanceData.type;
    
    // Traiter les champs numériques
    if (seanceData.duree !== undefined) {
      const dureeNumber = parseInt(String(seanceData.duree), 10);
      payload.duree = !isNaN(dureeNumber) ? dureeNumber : 60;
    }
    
    // Traiter les modules
    if (seanceData.modules !== undefined) {
      payload.modules = seanceData.modules.map(id => 
        typeof id === 'string' ? parseInt(id, 10) : id
      ).filter(id => !isNaN(id) && id > 0);
    }
    
    console.log('Service - Mise à jour séance (AVANT):', seanceData);
    console.log('Service - Mise à jour séance (FINAL):', payload);
    
    // Création de la requête avec en-têtes spécifiques
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    
    return this.http.put<{seance: Seance, message: string}>(
      `${this.apiUrl}/${id}`, 
      JSON.stringify(payload), 
      { headers }
    ).pipe(
      tap({
        next: response => console.log('Service - Réponse mise à jour reçue:', response),
        error: error => {
          console.error('Service - Erreur lors de la mise à jour:', error);
          if (error.error) {
            console.error('Service - Détail de l\'erreur de mise à jour:', error.error);
          }
        }
      })
    );
  }

  /**
   * Supprime une séance
   * @param id ID de la séance
   * @returns Observable avec message de confirmation
   */
  deleteSeance(id: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${id}`);
  }

  /**
   * Met à jour le suivi d'une séance pour l'utilisateur connecté
   * @param seanceId ID de la séance
   * @param suiviData Données de suivi (progression, statut)
   * @returns Observable avec le suivi mis à jour
   */
  updateSuivi(seanceId: number, suiviData: {progression: number, statut: string}): Observable<{suivi: any, message: string}> {
    // Convertir le statut en status_id
    const payload: any = {
      progression: suiviData.progression
    };
    
    // Conversion du statut en status_id (mapping selon la base de données)
    if (suiviData.statut) {
      switch (suiviData.statut.toUpperCase()) {
        case 'NON_COMMENCE':
          payload.status_id = 1;
          break;
        case 'EN_COURS':
          payload.status_id = 2;
          break;
        case 'TERMINE':
          payload.status_id = 3;
          break;
        case 'REPORTE':
          payload.status_id = 4;
          break;
        default:
          // Par défaut, utiliser "TERMINE" pour 100% de progression
          payload.status_id = suiviData.progression === 100 ? 3 : 2;
      }
    } else {
      // Par défaut, utiliser "TERMINE" pour 100% de progression
      payload.status_id = suiviData.progression === 100 ? 3 : 2;
    }
    
    console.log('Mise à jour du suivi - Données envoyées:', payload);
    
    return this.http.put<{suivi: any, message: string}>(`${this.apiUrl}/${seanceId}/suivi`, payload);
  }
}