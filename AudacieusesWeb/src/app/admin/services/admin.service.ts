import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Interfaces pour les statistiques
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalModules: number;
  totalSeances: number;
  recentActivity: RecentActivity[];
}

export interface RecentActivity {
  type: 'user' | 'module' | 'seance';
  date: string;
  description: string;
  user?: {
    id: number;
    nom: string;
    prenom: string;
    avatar: string;
    role: string;
  };
  module?: {
    id: number;
    titre: string;
    statut: string;
  };
  seance?: {
    id: number;
    titre: string;
    type: string;
  };
}

export interface UserStats {
  totalUsers: number;
  usersByRole: {
    role: string;
    count: number;
  }[];
  activeUsers: number;
  newUsers: number;
}

export interface ModuleStats {
  totalModules: number;
  modulesByStatus: {
    statut: string;
    count: number;
  }[];
  avgSeancesPerModule: number;
}

export interface SeanceStats {
  totalSeances: number;
  seancesByType: {
    type: string;
    count: number;
  }[];
  avgDuration: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  /**
   * Récupère les statistiques pour le tableau de bord admin
   * @returns Observable avec les statistiques
   */
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Récupère les statistiques détaillées des utilisateurs
   * @returns Observable avec les statistiques utilisateurs
   */
  getUserStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/user-stats`);
  }

  /**
   * Récupère les statistiques détaillées des modules
   * @returns Observable avec les statistiques modules
   */
  getModuleStats(): Observable<ModuleStats> {
    return this.http.get<ModuleStats>(`${this.apiUrl}/module-stats`);
  }

  /**
   * Récupère les statistiques détaillées des séances
   * @returns Observable avec les statistiques séances
   */
  getSeanceStats(): Observable<SeanceStats> {
    return this.http.get<SeanceStats>(`${this.apiUrl}/seance-stats`);
  }
}
