import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleNotificationService {
  private moduleCreatedSubject = new Subject<any>();
  private moduleUpdatedSubject = new Subject<any>();
  private moduleAssignedSubject = new Subject<any>();
  private adminNotificationSubject = new Subject<any>();

  constructor(private socketService: SocketService) {
    // S'abonner aux notifications de création de module
    this.socketService.onModuleCreated().subscribe(data => {
      this.moduleCreatedSubject.next(data);
    });

    // S'abonner aux notifications de mise à jour de module
    this.socketService.onModuleUpdated().subscribe(data => {
      this.moduleUpdatedSubject.next(data);
    });

    // S'abonner aux notifications d'attribution de module
    this.socketService.onModuleAssigned().subscribe(data => {
      this.moduleAssignedSubject.next(data);
    });

    // S'abonner aux notifications admin
    this.socketService.onAdminNotification().subscribe(data => {
      this.adminNotificationSubject.next(data);
    });
  }

  // Observable pour les modules créés
  get moduleCreated(): Observable<any> {
    return this.moduleCreatedSubject.asObservable();
  }

  // Observable pour les modules mis à jour
  get moduleUpdated(): Observable<any> {
    return this.moduleUpdatedSubject.asObservable();
  }

  // Observable pour les modules attribués
  get moduleAssigned(): Observable<any> {
    return this.moduleAssignedSubject.asObservable();
  }

  // Observable pour les notifications admin
  get adminNotification(): Observable<any> {
    return this.adminNotificationSubject.asObservable();
  }

  // Rejoindre une salle de module
  joinModuleRoom(moduleId: number): void {
    this.socketService.joinModuleRoom(moduleId);
  }
}