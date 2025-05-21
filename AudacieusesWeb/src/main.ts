import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { configureConsoleLogging } from './app/utils/console-config';
import { environment } from './environments/environment';

// Désactiver les logs en production
configureConsoleLogging();

// Log de démarrage visible uniquement en développement
if (!environment.production) {
  console.log('Application démarrant en mode développement');
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
