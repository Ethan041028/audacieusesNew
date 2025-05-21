/**
 * Configuration pour désactiver les logs en production
 * Importer ce fichier dans main.ts avant le bootstrap de l'application
 */
import { environment } from '../../environments/environment';

// Désactiver tous les logs en production pour améliorer les performances
// et éviter de fuiter des informations sensibles
export function configureConsoleLogging(): void {
  if (environment.production) {
    // Sauvegarde des fonctions originales de console
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      debug: console.debug,
      // Nous gardons error et assert pour faciliter le débogage en production
    };

    // Remplacer les fonctions de log par des fonctions vides
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.debug = () => {};
    
    // Si besoin de réactiver les logs pour un débogage spécifique, on peut utiliser:
    // window.enableConsoleLog = () => {
    //   console.log = originalConsole.log;
    //   console.info = originalConsole.info;
    //   console.warn = originalConsole.warn;
    //   console.debug = originalConsole.debug;
    // };
  }
}
