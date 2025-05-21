import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Service pour gérer les logs de l'application de manière conditionnelle
 * En production, aucun log ne sera affiché
 */
@Injectable({
  providedIn: 'root'
})
export class LoggingService {

  constructor() { }

  /**
   * Affiche un message de log si l'application n'est pas en production
   */
  log(...args: any[]): void {
    if (!environment.production) {
      console.log(...args);
    }
  }

  /**
   * Affiche un message d'erreur (même en production pour faciliter le débogage)
   */
  error(...args: any[]): void {
    console.error(...args);
  }

  /**
   * Affiche un message d'avertissement si l'application n'est pas en production
   */
  warn(...args: any[]): void {
    if (!environment.production) {
      console.warn(...args);
    }
  }

  /**
   * Affiche un message d'information si l'application n'est pas en production
   */
  info(...args: any[]): void {
    if (!environment.production) {
      console.info(...args);
    }
  }

  /**
   * Affiche un groupe de logs si l'application n'est pas en production
   */
  group(label: string): void {
    if (!environment.production) {
      console.group(label);
    }
  }

  /**
   * Ferme un groupe de logs si l'application n'est pas en production
   */
  groupEnd(): void {
    if (!environment.production) {
      console.groupEnd();
    }
  }
}
