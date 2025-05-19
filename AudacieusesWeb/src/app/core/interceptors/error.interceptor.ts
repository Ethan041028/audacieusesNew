import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      // Si c'est une erreur HTTP
      if (error instanceof HttpErrorResponse) {
        console.error('Erreur HTTP détectée :', error);
        
        if (error.status === 500) {
          console.error('Détails Erreur 500:', {
            message: error.message,
            statusText: error.statusText,
            url: error.url,
            headers: error.headers.keys().map(key => `${key}: ${error.headers.get(key)}`),
            error: error.error
          });
          
          // Si l'erreur contient des détails de validation ou DB
          if (error.error && typeof error.error === 'object') {
            console.error('Validation/DB errors:', error.error);
            
            // Si c'est une erreur de validation Sequelize
            if (error.error.name === 'SequelizeValidationError' || 
                error.error.name === 'SequelizeUniqueConstraintError') {
              const errorMessage = error.error.errors
                .map((e: any) => `${e.path}: ${e.message}`)
                .join(', ');
              notificationService.showError(`Erreur de validation: ${errorMessage}`);
            }
            // Si c'est une autre erreur Sequelize
            else if (error.error.name && error.error.name.includes('Sequelize')) {
              notificationService.showError(`Erreur de base de données: ${error.error.message}`);
            }
          }
        }
      }
      
      return throwError(() => error);
    })
  );
}; 