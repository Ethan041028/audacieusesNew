import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ModuleImageService {
  private apiBaseUrl = environment.apiUrl.replace('/api', ''); // Remove /api to get the base URL

  constructor() { }

  /**
   * Prépare l'URL correcte pour les images des modules
   * @param imagePath Le chemin de l'image tel que retourné par l'API
   * @param defaultImage Image par défaut si le chemin est vide ou invalide
   * @returns L'URL complète de l'image
   */  getModuleImageUrl(imagePath: string | null | undefined, defaultImage: string = '/assets/images/module-default.jpg'): string {
    if (!imagePath) {
      return defaultImage;
    }

    // Si l'image commence par http:// ou https://, c'est déjà une URL complète
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Utiliser directement l'URL complète pour éviter les problèmes CORS
    // Si le chemin commence par /uploads, ajouter l'URL du serveur backend
    if (imagePath.startsWith('/uploads')) {
      return `http://localhost:3000${imagePath}`;
    }
    
    // Si le chemin est juste le nom du fichier (module-*.jpg)
    return `http://localhost:3000/uploads/modules/${imagePath}`;
  }
}
