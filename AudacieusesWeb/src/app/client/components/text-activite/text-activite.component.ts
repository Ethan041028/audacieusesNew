import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiviteService } from '../../../services/activite.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-text-activite',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './text-activite.component.html',
  styleUrls: ['./text-activite.component.scss']
})
export class TextActiviteComponent implements OnInit {
  @Input() activite: any;
  @Output() completed = new EventEmitter<void>();
  
  textContent: string = '';
  isCompleted: boolean = false;
  
  constructor(
    private activiteService: ActiviteService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit(): void {
    // Extraire le contenu textuel correctement
    this.extractTextContent();
    
    // Vérifier si l'utilisateur a déjà lu cette activité
    this.checkExistingProgress();
  }
  
  extractTextContent(): void {
    if (typeof this.activite.contenu === 'string') {
      this.textContent = this.activite.contenu;
    } else if (typeof this.activite.contenu === 'object') {
      // Si le contenu est un objet JSON
      if (this.activite.contenu.contenu) {
        this.textContent = this.activite.contenu.contenu;
      } else {
        this.textContent = JSON.stringify(this.activite.contenu);
      }
    }
  }
  
  checkExistingProgress(): void {
    const userId = this.authService.currentUserValue?.user?.id;
    if (!userId) return;
    
    this.activiteService.getUserResponsesForActivite(this.activite.id, userId).subscribe({
      next: (response) => {
        if (response && response.reponse) {
          try {
            const progress = JSON.parse(response.reponse.reponse);
            if (progress.completed) {
              this.isCompleted = true;
            }
          } catch (e) {
            // Format invalide, on ignore
          }
        }
      },
      error: (err) => {
        // Pas de réponse existante, on continue normalement
      }
    });
  }
  
  markAsRead(): void {
    const userId = this.authService.currentUserValue?.user?.id;
    if (!userId) {
      this.notificationService.showError('Utilisateur non connecté');
      return;
    }
    
    const progressData = JSON.stringify({
      completed: true
    });
    
    this.activiteService.saveQuestionResponse(this.activite.id, userId, progressData).subscribe({
      next: () => {
        this.isCompleted = true;
        this.notificationService.showSuccess('Lecture enregistrée !');
      },
      error: (err) => {
        this.notificationService.showError('Erreur lors de l\'enregistrement de la progression');
        console.error('Erreur lors de l\'enregistrement de la progression', err);
      }
    });
  }
  
  continueToNext(): void {
    this.completed.emit();
  }
}
