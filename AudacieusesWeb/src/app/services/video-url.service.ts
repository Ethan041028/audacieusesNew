import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VideoUrlService {
  // URL de base du serveur backend
  private backendUrl = 'http://localhost:3000';

  // Types de vidéos supportés
  public readonly VIDEO_TYPE = {
    FILE: 'file',
    YOUTUBE: 'youtube',
    VIMEO: 'vimeo',
    UNKNOWN: 'unknown'
  };

  constructor() { }

  /**
   * Détermine le type de vidéo à partir de l'URL
   * @param url L'URL de la vidéo
   * @returns Le type de vidéo (file, youtube, vimeo, unknown)
   */
  getVideoType(url: string): string {
    if (!url) return this.VIDEO_TYPE.UNKNOWN;

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return this.VIDEO_TYPE.YOUTUBE;
    } else if (url.includes('vimeo.com')) {
      return this.VIDEO_TYPE.VIMEO;
    } else if (url.startsWith('http') || url.startsWith('/')) {
      return this.VIDEO_TYPE.FILE;
    }
    
    return this.VIDEO_TYPE.UNKNOWN;
  }
  /**
   * Extrait l'ID d'une vidéo YouTube à partir de son URL
   * @param url L'URL YouTube
   * @returns L'ID de la vidéo
   */
  extractYoutubeId(url: string): string | null {
    if (!url) return null;
    
    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    // ou: https://youtu.be/VIDEO_ID
    let videoId = null;
    
    if (url.includes('youtube.com')) {
      const urlParams = new URL(url).searchParams;
      videoId = urlParams.get('v');
    } else if (url.includes('youtu.be')) {
      videoId = url.split('/').pop() || null;
    }
    
    return videoId;
  }
  /**
   * Extrait l'ID d'une vidéo Vimeo à partir de son URL
   * @param url L'URL Vimeo
   * @returns L'ID de la vidéo
   */
  extractVimeoId(url: string): string | null {
    if (!url) return null;
    
    // Format: https://vimeo.com/VIDEO_ID
    let videoId = null;
    
    if (url.includes('vimeo.com')) {
      videoId = url.split('/').pop() || null;
    }
    
    return videoId;
  }

  /**
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
      return defaultVideo;    }    try {
      // Pour les URL YouTube et Vimeo, retourner directement l'URL
      const videoType = this.getVideoType(videoPath);
      console.log('VideoUrlService: Video type détecté:', videoType);
      
      if (videoType === this.VIDEO_TYPE.YOUTUBE || videoType === this.VIDEO_TYPE.VIMEO) {
        return videoPath;
      }

      // Si la vidéo commence par http:// ou https://, c'est déjà une URL complète (fichier direct)
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
