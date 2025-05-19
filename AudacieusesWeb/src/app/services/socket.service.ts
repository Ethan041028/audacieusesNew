import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private apiBaseUrl = environment.apiUrl.replace('/api', ''); // Pour enlever '/api' de l'URL
  constructor() {
    // Récupérer le token depuis l'objet currentUser stocké dans localStorage
    const currentUser = localStorage.getItem('currentUser');
    let token = null;
    
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        token = userData.token;
      } catch (e) {
        console.error('Erreur lors de la récupération du token:', e);
      }
    }
    
    this.socket = io(this.apiBaseUrl, {
      withCredentials: true,
      autoConnect: false, // Ne pas se connecter automatiquement
      auth: {
        token: token
      }
    });

    // Ajouter des écouteurs d'événements pour le débogage
    this.socket.on('connect_error', (err) => {
      console.error('Erreur de connexion Socket.io:', err.message);
    });

    this.socket.on('error', (err) => {
      console.error('Erreur Socket.io:', err);
    });
  }  // Connecter l'utilisateur et rejoindre sa salle privée
  connect(userId: number): void {
    try {
      // Récupérer le token depuis l'objet currentUser stocké dans localStorage
      const currentUser = localStorage.getItem('currentUser');
      let token = null;
      
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          token = userData.token;
        } catch (e) {
          console.error('Erreur lors de la récupération du token:', e);
        }
      }
      
      if (!token) {
        console.warn('Tentative de connexion socket sans token d\'authentification');
      }
      
      // Mettre à jour le token d'authentification
      this.socket.auth = { token };
      
      if (!this.socket.connected) {
        this.socket.connect();
        
        // Rejoindre la salle privée de l'utilisateur
        this.socket.emit('join-user-room', userId);
        console.log(`Socket connecté et salle utilisateur ${userId} rejointe`);
        
        // Ajouter un gestionnaire d'erreur spécifique pour cet événement
        this.socket.on('connect_error', (error) => {
          console.error(`Erreur de connexion socket: ${error.message}`);
        });
      }
    } catch (error) {
      console.error('Erreur lors de la connexion socket:', error);
    }
  }

  // Déconnecter le socket
  disconnect(): void {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  // Rejoindre une salle de module
  joinModuleRoom(moduleId: number): void {
    this.socket.emit('join-module-room', moduleId);
  }

  // Rejoindre une salle de séance
  joinSeanceRoom(seanceId: number): void {
    this.socket.emit('join-seance-room', seanceId);
  }

  // Écouter les notifications de création de module
  onModuleCreated(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('module-created', (data: any) => {
        observer.next(data);
      });
      
      return () => {
        this.socket.off('module-created');
      };
    });
  }

  // Écouter les notifications de mise à jour de module
  onModuleUpdated(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('module-updated', (data: any) => {
        observer.next(data);
      });
      
      return () => {
        this.socket.off('module-updated');
      };
    });
  }

  // Écouter les notifications d'attribution de module
  onModuleAssigned(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('module-assigned', (data: any) => {
        observer.next(data);
      });
      
      return () => {
        this.socket.off('module-assigned');
      };
    });
  }

  // Écouter les notifications admin
  onAdminNotification(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('admin-notification', (data: any) => {
        observer.next(data);
      });
      
      return () => {
        this.socket.off('admin-notification');
      };
    });
  }

  // Écouter les notifications de module complété
  onModuleCompleted(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('module-completed', (data: any) => {
        observer.next(data);
      });
      
      return () => {
        this.socket.off('module-completed');
      };
    });
  }
  
  // Écouter les notifications de rafraîchissement des modules
  onRefreshModules(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('refresh-modules', (data: any) => {
        observer.next(data);
      });
      
      return () => {
        this.socket.off('refresh-modules');
      };
    });
  }
  
  // Envoyer une notification personnalisée à un utilisateur spécifique
  sendCustomEvent(eventName: string, data: any): void {
    if (this.socket.connected) {
      this.socket.emit(eventName, data);
      console.log(`Événement Socket.IO '${eventName}' envoyé:`, data);
    } else {
      console.warn(`Socket non connecté. Impossible d'envoyer l'événement '${eventName}'`);
    }
  }
}