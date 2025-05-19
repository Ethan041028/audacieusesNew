import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor() { }

  // Afficher un message de succès
  showSuccess(message: string, duration: number = 3000): void {
    this.showToast(message, 'success', duration);
  }

  // Afficher un message d'erreur
  showError(message: string, duration: number = 5000): void {
    this.showToast(message, 'danger', duration);
  }

  // Afficher un message d'information
  showInfo(message: string, duration: number = 3000): void {
    this.showToast(message, 'info', duration);
  }

  // Afficher un message d'avertissement
  showWarning(message: string, duration: number = 4000): void {
    this.showToast(message, 'warning', duration);
  }

  // Méthode privée pour créer et afficher un toast
  private showToast(message: string, type: 'success' | 'danger' | 'info' | 'warning', duration: number): void {
    // Créer l'élément toast
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white bg-${type} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    toastElement.style.position = 'fixed';
    toastElement.style.bottom = '20px';
    toastElement.style.right = '20px';
    toastElement.style.minWidth = '250px';
    toastElement.style.zIndex = '1050';

    // Créer le contenu du toast
    const toastContent = document.createElement('div');
    toastContent.className = 'd-flex';

    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');

    toastContent.appendChild(toastBody);
    toastContent.appendChild(closeButton);
    toastElement.appendChild(toastContent);

    // Ajouter le toast au document
    document.body.appendChild(toastElement);

    // Initialiser et afficher le toast
    // @ts-ignore
    const toast = new bootstrap.Toast(toastElement, {
      autohide: true,
      delay: duration
    });
    toast.show();

    // Nettoyer après que le toast soit caché
    toastElement.addEventListener('hidden.bs.toast', () => {
      document.body.removeChild(toastElement);
    });
  }
}
