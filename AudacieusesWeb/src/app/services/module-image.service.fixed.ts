// filepath: module-image.service.fixed.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModuleImageService {
  // URL de base du serveur backend
  private backendUrl = 'http://localhost:3000';

  constructor() { }

  /**
   * Prépare l'URL correcte pour les images des modules
   * @param imagePath Le chemin de l'image tel que retourné par l'API
   * @param defaultImage Image par défaut si le chemin est vide ou invalide
   * @returns L'URL complète de l'image
   */
  getModuleImageUrl(imagePath: string | null | undefined, defaultImage: string = '/assets/images/module-default.jpg'): string {
    if (!imagePath) {
      return defaultImage;
    }

    // Si l'image commence par http:// ou https://, c'est déjà une URL complète
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Nettoyage du chemin pour éviter les problèmes
    const cleanPath = imagePath.trim();
    
    // Si le chemin commence par /uploads, utiliser directement l'URL complète
    if (cleanPath.startsWith('/uploads')) {
      return `${this.backendUrl}${cleanPath}`;
    }
    
    // Si le chemin est juste le nom du fichier (module-*.jpg)
    return `${this.backendUrl}/uploads/modules/${cleanPath}`;
  }
}
