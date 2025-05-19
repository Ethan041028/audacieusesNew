// filepath: video-url.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VideoUrlService {
  // URL de base du serveur backend
  private backendUrl = 'http://localhost:3000';

  constructor() { }  /**
   * Prépare l'URL correcte pour les vidéos des activités
   * @param videoPath Le chemin de la vidéo tel que retourné par l'API
   * @param defaultVideo Vidéo par défaut si le chemin est vide ou invalide
   * @returns L'URL complète de la vidéo
   */
  getVideoUrl(videoPath: any, defaultVideo: string | null = null): string | null {
    console.log('VideoUrlService: input value:', videoPath);
    
    // Si videoPath est un objet qui a une propriété url
    if (videoPath && typeof videoPath === 'object') {
      if (videoPath.url && typeof videoPath.url === 'string') {
        console.log('VideoUrlService: extracting URL from object:', videoPath.url);
        videoPath = videoPath.url;
      } else if (videoPath.source && typeof videoPath.source === 'string') {
        console.log('VideoUrlService: extracting source from object:', videoPath.source);
        videoPath = videoPath.source;
      } else if (videoPath.video && typeof videoPath.video === 'string') {
        console.log('VideoUrlService: extracting video from object:', videoPath.video);
        videoPath = videoPath.video;
      } else {
        console.warn('VideoUrlService: unable to extract URL from object:', videoPath);
        return defaultVideo;
      }
    }
    
    // Vérification que videoPath est une chaîne de caractères valide
    if (!videoPath || typeof videoPath !== 'string') {
      console.warn('VideoUrlService: videoPath n\'est pas une chaîne valide', videoPath);
      return defaultVideo;
    }    try {
      // Si la vidéo commence par http:// ou https://, c'est déjà une URL complète (YouTube, Vimeo, etc.)
      if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
        return videoPath;
      }

      // Nettoyage du chemin pour éviter les problèmes
      const cleanPath = videoPath.trim();
      
      // Si le chemin commence par /uploads, utiliser directement l'URL complète
      if (cleanPath.startsWith('/uploads')) {
        return `${this.backendUrl}${cleanPath}`;
      }
      
      // Si le chemin est juste le nom du fichier
      return `${this.backendUrl}/uploads/videos/${cleanPath}`;
    } catch (error) {
      console.error('VideoUrlService: Erreur lors du formatage de l\'URL vidéo', error, videoPath);
      return defaultVideo;
    }
  }
}
