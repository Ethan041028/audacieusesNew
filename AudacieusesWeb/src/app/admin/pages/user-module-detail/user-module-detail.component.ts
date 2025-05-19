import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ModuleService } from '../../services/module.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-user-module-detail',
  templateUrl: './user-module-detail.component.html',
  styleUrls: ['./user-module-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink]
})
export class UserModuleDetailComponent implements OnInit {
  userId: number = 0;
  moduleId: number = 0;
  user: any = null;
  module: any = null;
  activites: any[] = [];
  
  // États de chargement
  loading = {
    user: true,
    module: true,
    activites: true
  };
  
  // Gestion des erreurs
  error = {
    user: null as string | null,
    module: null as string | null,
    activites: null as string | null
  };
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private moduleService: ModuleService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    // Récupérer les IDs depuis l'URL
    this.route.params.subscribe(params => {
      this.userId = +params['userId'];
      this.moduleId = +params['moduleId'];
      
      // Charger les données
      this.loadUserDetails();
      this.loadModuleDetails();
      this.loadUserActivites();
    });
  }
  
  loadUserDetails(): void {
    this.loading.user = true;
    this.error.user = null;
    
    this.userService.getUserById(this.userId).subscribe({
      next: (response) => {
        this.user = response.user;
        this.loading.user = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des détails de l\'utilisateur', err);
        this.error.user = 'Impossible de charger les détails de l\'utilisateur. Veuillez réessayer.';
        this.loading.user = false;
      }
    });
  }
  
  loadModuleDetails(): void {
    this.loading.module = true;
    this.error.module = null;
    
    this.moduleService.getModuleById(this.moduleId).subscribe({
      next: (response) => {
        this.module = response.module;
        this.loading.module = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des détails du module', err);
        this.error.module = 'Impossible de charger les détails du module. Veuillez réessayer.';
        this.loading.module = false;
      }
    });
  }
  
  loadUserActivites(): void {
    this.loading.activites = true;
    this.error.activites = null;
    
    // Appel API pour récupérer les activités et réponses de l'utilisateur pour ce module
    this.moduleService.getUserModuleActivites(this.userId, this.moduleId).subscribe({
      next: (response) => {
        this.activites = response.activites || [];
        
        // Formater les réponses pour éviter les problèmes d'affichage [object Object]
        this.activites.forEach(activite => {
          if (activite.reponses && activite.reponses.length > 0) {
            activite.reponses.forEach((reponse: any) => {
              // Vérifier si la question est un objet
              if (typeof reponse.question === 'object' && reponse.question !== null) {
                reponse.question = this.formatObjectResponse(reponse.question);
              }
              
              // Vérifier si la réponse est un objet
              if (typeof reponse.reponse === 'object' && reponse.reponse !== null) {
                reponse.reponse = this.formatObjectResponse(reponse.reponse);
              }
            });
          }
        });
        
        this.loading.activites = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des activités de l\'utilisateur', err);
        this.error.activites = 'Impossible de charger les activités de l\'utilisateur. Veuillez réessayer.';
        this.loading.activites = false;
      }
    });
  }
  
  // Méthode pour formater proprement un objet réponse
  formatObjectResponse(response: any): string {
    try {
      // Si c'est un QCM
      if (response.type === 'qcm' && response.questions) {
        let result = `<strong>Type:</strong> QCM<br><br>`;
        
        response.questions.forEach((question: any, index: number) => {
          result += `<div class="qcm-question">
            <p class="question-text">${question.texte}</p>
            <ul class="options-list">`;
          
          question.options.forEach((option: string, optIndex: number) => {
            const isCorrect = question.reponse_correcte === optIndex;
            result += `<li class="${isCorrect ? 'correct-answer' : ''}">
              ${option} ${isCorrect ? '<span class="correct-badge">✓</span>' : ''}
            </li>`;
          });
          
          result += `</ul>
          </div>`;
          
          if (index < response.questions.length - 1) {
            result += '<hr>';
          }
        });
        
        return result;
      }
      
      // Si c'est un objet JSON avec un type spécifique
      if (response.type) {
        switch (response.type) {
          case 'QUIZ':
            let result = `<strong>Type:</strong> Quiz<br>`;
            result += `<strong>Réponse choisie:</strong> ${response.reponse || 'Non spécifiée'}<br>`;
            if (response.completed) {
              result += `<strong>Complété le:</strong> ${new Date(response.completedAt).toLocaleString()}<br>`;
            }
            return result;
          case 'TEXT':
            return `<strong>Type:</strong> Texte<br><strong>Réponse:</strong> ${response.reponse || 'Pas de réponse'}`;
          default:
            // Pour les autres types, formater en JSON avec indentation
            return `<pre>${JSON.stringify(response, null, 2)}</pre>`;
        }
      }
      
      // Pour les objets génériques, formater en JSON avec indentation
      return `<pre>${JSON.stringify(response, null, 2)}</pre>`;
    } catch (e) {
      // En cas d'erreur, renvoyer une chaîne simple
      return String(response);
    }
  }
  
  // Retourner à la page de gestion des modules de l'utilisateur
  goBack(): void {
    this.router.navigate(['/admin/users', this.userId, 'modules']);
  }
  
  // Obtenir le statut d'une activité
  getActiviteStatus(activite: any): string {
    if (!activite.suivi) return 'Non commencé';
    
    switch(activite.suivi.status_id) {
      case 1: return 'Non commencé';
      case 2: return 'En cours';
      case 3: return 'Terminé';
      default: return 'Inconnu';
    }
  }
  
  // Obtenir la classe CSS en fonction du statut
  getStatusClass(activite: any): string {
    if (!activite.suivi) return 'bg-secondary';
    
    switch(activite.suivi.status_id) {
      case 1: return 'bg-secondary';
      case 2: return 'bg-warning text-dark';
      case 3: return 'bg-success';
      default: return 'bg-secondary';
    }
  }
} 