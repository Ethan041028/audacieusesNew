import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiviteService } from '../../../services/activite.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { VideoUrlService } from '../../../services/video-url.service';

@Component({
  selector: 'app-video-activite',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './video-activite.component.html',
  styleUrls: ['./video-activite.component.scss']
})
export class VideoActiviteComponent implements OnInit {
  @Input() activite: any;
  @Output() completed = new EventEmitter<void>();
  
  isVideoLoaded: boolean = false;
  isVideoCompleted: boolean = false;
  videoProgress: number = 0;
  videoError: string | null = null;
  videoUrl: string | null = null;
  
  constructor(
    private activiteService: ActiviteService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private videoUrlService: VideoUrlService
  ) {}
  
  ngOnInit(): void {
    // Vérifier si l'utilisateur a déjà visionné cette activité
    this.checkExistingProgress();
    
    // Construire l'URL de la vidéo
    this.prepareVideoUrl();
  }
  /**
   * Prépare l'URL de la vidéo à afficher
   */  
  prepareVideoUrl(): void {
    console.log('Contenu de l\'activité:', this.activite.contenu);
    
    try {
      if (!this.activite || !this.activite.contenu) {
        this.videoError = "Activité ou contenu manquant";
        console.error('Activité ou contenu manquant', this.activite);
        return;
      }
      
      // Vérifier si le contenu est de type texte et l'indiquer à l'utilisateur
      if (this.activite.contenu?.type === 'texte') {
        this.videoError = "Ce contenu est de type texte et ne contient pas de vidéo";
        console.log('Contenu de type texte, pas de vidéo disponible');
        return;
      }
      
      // Définir une vidéo par défaut (null = pas de vidéo par défaut)
      const defaultVideo = '/assets/videos/video-placeholder.mp4';
      
      // Passer directement l'objet ou la chaîne au service qui s'occupera de l'extraction
      // Le service est maintenant plus robuste et gère tous les cas
      this.videoUrl = this.videoUrlService.getVideoUrl(this.activite.contenu, defaultVideo);
      console.log('URL vidéo formatée:', this.videoUrl);
      
      // Si l'URL est null après formatage et qu'on n'a pas de vidéo par défaut, générer une erreur
      if (!this.videoUrl) {
        this.videoError = "Format de source vidéo invalide ou incompatible";
      }
    } catch (error) {
      console.error('Erreur lors de la préparation de l\'URL vidéo:', error);
      this.videoError = "Erreur lors du traitement de la vidéo";
    }
  }
  
  checkExistingProgress(): void {
    const userId = this.authService.currentUserValue?.user?.id;
    if (!userId) return;
    
    this.activiteService.getUserResponsesForActivite(this.activite.id, userId).subscribe({
      next: (response) => {
        console.log('Vérification progression vidéo existante:', response);
        
        // Si une réponse avec contenu valide existe
        if (response && response.reponse && response.reponse.reponse) {
          try {
            const reponseContent = response.reponse.reponse;
            // Essayer de parser la chaîne JSON si c'est une chaîne
            const progress = typeof reponseContent === 'string' ? 
              JSON.parse(reponseContent) : 
              reponseContent;
              
            if (progress && progress.completed) {
              this.isVideoCompleted = true;
            }
            if (progress && typeof progress.progress === 'number') {
              this.videoProgress = progress.progress || 0;
            }
          } catch (e) {
            // Format invalide, on ignore
            console.warn('Format de progression invalide:', e);
          }
        } else {
          console.log('Aucune progression existante pour cette vidéo');
        }
      }
    });
  }
  
  onVideoLoaded(): void {
    this.isVideoLoaded = true;
    this.videoError = null;
  }
  
  onVideoError(event: any): void {
    this.videoError = "Impossible de charger la vidéo. Veuillez réessayer plus tard.";
    this.isVideoLoaded = false;
  }
  
  onVideoTimeUpdate(event: any): void {
    const video = event.target;
    // Sauvegarder la progression toutes les 10 secondes
    if (video.currentTime % 10 < 1 && video.currentTime > 0) {
      this.saveProgress(video.currentTime / video.duration * 100);
    }
  }
  
  onVideoEnded(): void {
    this.isVideoCompleted = true;
    this.saveProgress(100, true);
    setTimeout(() => {
      this.completed.emit();
    }, 1000);
  }
  
  saveProgress(progress: number, completed: boolean = false): void {
    const userId = this.authService.currentUserValue?.user?.id;
    if (!userId) return;
    
    const progressData = JSON.stringify({
      progress: Math.round(progress),
      completed: completed
    });
    
    this.activiteService.saveQuestionResponse(this.activite.id, userId, progressData).subscribe({
      next: () => {
        this.videoProgress = progress;
        if (completed) {
          this.notificationService.showSuccess('Vidéo terminée !');
        }
      },
      error: (err) => {
        console.error('Erreur lors de la sauvegarde de la progression', err);
      }
    });
  }
  
  continueToNext(): void {
    this.completed.emit();
  }
}
