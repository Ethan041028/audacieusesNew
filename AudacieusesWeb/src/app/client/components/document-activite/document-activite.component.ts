import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiviteService } from '../../../services/activite.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-document-activite',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './document-activite.component.html',
  styleUrls: ['./document-activite.component.scss']
})
export class DocumentActiviteComponent implements OnInit {
  @Input() activite: any;
  @Output() completed = new EventEmitter<void>();
  
  documentUrl: string = '';
  documentDescription: string = '';
  isCompleted: boolean = false;
  
  constructor(
    private activiteService: ActiviteService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit(): void {
    // Extraire les informations du document
    this.extractDocumentInfo();
    
    // Vérifier si l'utilisateur a déjà téléchargé ce document
    this.checkExistingProgress();
  }
  
  extractDocumentInfo(): void {
    if (typeof this.activite.contenu === 'object') {
      this.documentUrl = this.activite.contenu.url || '';
      this.documentDescription = this.activite.contenu.description || '';
    } else if (typeof this.activite.contenu === 'string') {
      try {
        // Essayer de le parser comme JSON
        const content = JSON.parse(this.activite.contenu);
        this.documentUrl = content.url || '';
        this.documentDescription = content.description || '';
      } catch (e) {
        // Si ce n'est pas du JSON, on suppose que c'est une URL
        this.documentUrl = this.activite.contenu;
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
  
  downloadDocument(): void {
    const userId = this.authService.currentUserValue?.user?.id;
    if (!userId) {
      this.notificationService.showError('Utilisateur non connecté');
      return;
    }
    
    // Marquer le document comme téléchargé
    const progressData = JSON.stringify({
      completed: true
    });
    
    this.activiteService.saveQuestionResponse(this.activite.id, userId, progressData).subscribe({
      next: () => {
        this.isCompleted = true;
        this.notificationService.showSuccess('Téléchargement enregistré !');
      },
      error: (err) => {
        this.notificationService.showError('Erreur lors de l\'enregistrement de la progression');
        console.error('Erreur lors de l\'enregistrement de la progression', err);
      }
    });
    
    // Déclencher le téléchargement
    // Le téléchargement est géré par l'attribut download dans le template HTML
  }
  
  continueToNext(): void {
    this.completed.emit();
  }
}
