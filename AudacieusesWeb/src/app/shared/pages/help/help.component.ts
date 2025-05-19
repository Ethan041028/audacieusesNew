import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <div class="card shadow">
        <div class="card-header bg-primary text-white">
          <h2 class="my-2"><i class="fas fa-headset me-2"></i> Contact et assistance</h2>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <div class="mb-4">
                <h3 class="mb-3">Besoin d'aide ?</h3>
                <p>Pour toute question concernant la plateforme, n'hésitez pas à contacter notre équipe d'assistance.</p>
                <p>Notre gérante est disponible du lundi au vendredi de 9h à 17h pour répondre à vos questions.</p>
              </div>
              
              <div class="mb-4">
                <h3 class="mb-3">Coordonnées de contact</h3>
                <div class="d-flex align-items-center mb-2">
                  <i class="fas fa-user-tie me-3 text-primary fa-2x"></i>
                  <div>
                    <strong>Mme Audacieuse</strong><br>
                    Gérante de la plateforme
                  </div>
                </div>
                <div class="d-flex align-items-center mb-2">
                  <i class="fas fa-phone-alt me-3 text-primary fa-2x"></i>
                  <div>
                    <strong>Téléphone</strong><br>
                    +33 (0)1 23 45 67 89
                  </div>
                </div>
                <div class="d-flex align-items-center mb-2">
                  <i class="fas fa-envelope me-3 text-primary fa-2x"></i>
                  <div>
                    <strong>Email</strong><br>
                    <a [href]="'mailto:contact' + atChar + 'lesaudacieuses.fr'">contact{{ atChar }}lesaudacieuses.fr</a>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6">
              <div class="card bg-light">
                <div class="card-header">
                  <h4 class="mb-0">Horaires d'assistance</h4>
                </div>
                <div class="card-body">
                  <ul class="list-group list-group-flush">
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Lundi
                      <span>9h - 17h</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Mardi
                      <span>9h - 17h</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Mercredi
                      <span>9h - 17h</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Jeudi
                      <span>9h - 17h</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Vendredi
                      <span>9h - 17h</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      Weekend
                      <span class="text-muted">Fermé</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div class="mt-4">
                <h4>FAQ</h4>
                <p>Pour les questions fréquemment posées, consultez notre <a href="#">Guide d'utilisation</a>.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border-radius: 10px;
      overflow: hidden;
    }
    
    .card-header {
      font-weight: 500;
    }
    
    .list-group-item {
      transition: background-color 0.2s;
    }
    
    .list-group-item:hover {
      background-color: rgba(0,0,0,0.03);
    }
  `]
})
export class HelpComponent {
  // Utiliser une propriété pour le caractère @
  public atChar = '@';
  
  constructor() { }
}
