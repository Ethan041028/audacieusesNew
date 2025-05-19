import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ModuleService } from '../../services/module.service';
import { NotificationService } from '../../../services/notification.service';
import { environment } from '../../../../environments/environment';
import { HttpParams } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { SeanceService } from '../../../services/seance.service';
import { ModuleImageService } from '../../../services/module-image.service';

@Component({
  selector: 'app-modules',
  templateUrl: './modules.component.html',
  styleUrls: ['./modules.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule]
})
export class ModulesComponent implements OnInit {
  allModules: any[] = []; // Stocke tous les modules non filtrés
  modules: any[] = []; // Modules filtrés qui sont affichés
  loading = true;
  error: string | null = null;
  filter = 'all'; // 'all', 'published', 'draft'
  searchQuery = '';
  sortBy = 'date_creation';
  sortOrder = 'desc';
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  
  // Propriétés pour la gestion des séances
  availableSeances: any[] = [];
  moduleSeances: any[] = []; // Séances actuellement associées au module
  selectedSeances: number[] = [];
  currentModuleId: number | null = null;
  seanceSearchQuery: string = '';
  loadingSeances: boolean = false;
  activeTab: 'available' | 'current' = 'current'; // Tab actif dans le modal des séances
  
  // Formulaire pour la création et l'édition de module
  moduleForm: FormGroup;
  categories: any[] = [
    { id: 1, nom: 'Orientation professionnelle' },
    { id: 2, nom: 'Développement personnel' },
    { id: 3, nom: 'Compétences techniques' }
  ];

  // Récupération directe des modules pour contourner les problèmes potentiels d'API
  useDirectFetch: boolean = false;
  directFetchModules: any[] = [];

  // Propriétés pour la modification d'un module
  currentModuleImageUrl: string | null = null;
  isEditMode: boolean = false;

  constructor(
    private moduleService: ModuleService,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private authService: AuthService,
    private http: HttpClient,
    private seanceService: SeanceService,
    private moduleImageService: ModuleImageService
  ) {
    // Initialisation du formulaire
    this.moduleForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      statut: ['brouillon', Validators.required],
      categorie_id: [1, Validators.required],
      type_seance_defaut: ['individuelle', Validators.required],
      duree_seance_defaut: [60, [Validators.required, Validators.min(15)]],
      // Nouveaux champs
      niveau: ['Débutant', Validators.required],
      duree: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      objectifs: this.fb.array([this.createObjectif()])
    });
  }

  ngOnInit(): void {
    // Charger d'abord les modules normalement
    this.loadModules();
    
    // Puis tester la méthode directe en arrière-plan
    setTimeout(() => {
      this.testDirectApiCall().then(() => {
        // Si on a récupéré plus de modules par la méthode directe que par le service standard
        if (this.directFetchModules.length > this.allModules.length) {
          console.log(`La méthode directe a trouvé plus de modules (${this.directFetchModules.length}) que le service standard (${this.allModules.length})`);
          
          // Activer automatiquement le mode direct dans ce cas
          if (!this.useDirectFetch) {
            this.toggleDirectFetch();
          }
        }
      });
    }, 1000); // Attendre 1 seconde pour ne pas surcharger l'API
    
    // Réinitialiser le formulaire lorsque le modal de création est fermé
    const newModuleModal = document.getElementById('newModuleModal');
    if (newModuleModal) {
      newModuleModal.addEventListener('hidden.bs.modal', () => {
        this.resetModuleForm();
      });
    }
    
    // Réinitialiser les états lorsque le modal d'édition est fermé
    const editModuleModal = document.getElementById('editModuleModal');
    if (editModuleModal) {
      editModuleModal.addEventListener('hidden.bs.modal', () => {
        this.isEditMode = false;
        this.currentModuleId = null;
        this.currentModuleImageUrl = null;
        this.resetModuleForm();
      });
    }
  }

  loadModules(): void {
    this.loading = true;
    this.error = null;
    
    // Si nous avons activé la récupération directe et que nous avons des modules, les utiliser
    if (this.useDirectFetch && this.directFetchModules.length > 0) {
      console.log('Utilisation des modules récupérés directement via fetch:', this.directFetchModules.length);
      this.allModules = [...this.directFetchModules];
      this.applyFilters();
      this.loading = false;
      return;
    }
    
    // Sinon, continuer avec la méthode normale
    // On ne passe que les options de tri à l'API, et on ajoute debug=true et noFilter=true
    // pour demander à l'API d'ignorer les filtres et de renvoyer tous les modules
    const options: any = {
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      debug: 'true',
      noFilter: 'true'
    };
    
    console.log('----------------------');
    console.log('CHARGEMENT DES MODULES:');
    console.log('Options envoyées à l\'API:', options);
    
    // Afficher comment le service va transformer ces options en paramètres d'URL
    let params = new HttpParams();
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.sortOrder) params = params.set('sortOrder', options.sortOrder);
    if (options.debug) params = params.set('debug', options.debug);
    if (options.noFilter) params = params.set('noFilter', options.noFilter);
    
    console.log('Paramètres d\'URL réels qui seront envoyés:', params.toString());
    console.log('URL qui sera appelée:', `${environment.apiUrl}/modules?${params.toString()}`);
    console.log('----------------------');
    
    this.moduleService.getAllModules(options).subscribe({
      next: (response: any) => {
        console.log('----------------------');
        console.log('RÉPONSE API DÉTAILLÉE:');
        console.log('----------------------');
        console.log('Structure complète de la réponse:', JSON.stringify(response));
        console.log('----------------------');
        console.log('Réponse API complète:', response);
        console.log('Modules reçus:', response.modules);
        console.log('Nombre total de modules reçus:', response.modules?.length || 0);
        
        // Stocker tous les modules reçus
        this.allModules = response.modules || [];
        
        // Appliquer les filtres côté client
        this.applyFilters();
        
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erreur détaillée lors du chargement des modules:', err);
        
        // En cas d'erreur, essayer de récupérer les modules directement si disponibles
        if (this.directFetchModules.length > 0) {
          console.log('Utilisation des modules récupérés directement via fetch suite à une erreur');
          this.allModules = [...this.directFetchModules];
          this.applyFilters();
          this.error = 'Récupération via API échouée, utilisation des données en cache.';
        } else {
          this.error = 'Impossible de charger les modules. Veuillez réessayer.';
        }
        
        this.loading = false;
      }
    });
  }

  // Filtrer les modules côté client
  applyFilters(): void {
    console.log('Filtrage côté client avec filtre:', this.filter);
    console.log('Recherche:', this.searchQuery);
    
    // Partir de tous les modules
    let filteredModules = [...this.allModules];
    
    // Appliquer le filtre de statut
    if (this.filter !== 'all') {
      filteredModules = filteredModules.filter(module => module.statut === this.filter);
      console.log(`Après filtrage par statut '${this.filter}':`, filteredModules.length, 'modules');
    }
    
    // Appliquer la recherche
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      filteredModules = filteredModules.filter(module => 
        (module.titre && module.titre.toLowerCase().includes(query)) || 
        (module.description && module.description.toLowerCase().includes(query))
      );
      console.log(`Après recherche '${query}':`, filteredModules.length, 'modules');
    }
    
    // Mettre à jour les modules affichés
    this.modules = filteredModules;
    console.log('Modules après filtrage:', this.modules.length);
    
    // Afficher les détails des modules filtrés
    if (this.modules.length > 0) {
      this.modules.forEach((module: any, index: number) => {
        console.log(`Module ${index + 1}:`, {
          id: module.id,
          titre: module.titre,
          statut: module.statut,
          séances: module.seances?.length || 0
        });
      });
    }
  }

  // Recherche de modules (maintenant appliquée localement)
  searchModules(): void {
    console.log('Recherche de modules avec texte:', this.searchQuery);
    this.applyFilters();
  }

  // Filtrer les modules (maintenant appliqué localement)
  filterModules(filter: string): void {
    console.log('Changement de filtre:', filter);
    
    // Mapping des filtres UI vers les valeurs réelles en BDD
    if (filter === 'published') {
      this.filter = 'publié';
      console.log('Filtre mappé: published → publié');
    } else if (filter === 'draft') {
      this.filter = 'brouillon';
      console.log('Filtre mappé: draft → brouillon');
    } else {
      this.filter = filter; // 'all' ou autre
      console.log('Filtre conservé tel quel:', filter);
    }
    
    console.log('Filtre final qui sera utilisé:', this.filter);
    this.applyFilters();
  }

  // Tri des modules
  sortModules(sortBy: string): void {
    // Si on clique sur le même critère de tri, on inverse l'ordre
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'asc';
    }
    
    console.log('Tri des modules par:', sortBy, 'ordre:', this.sortOrder);
    
    // Si tri par nombre de séances, on le fait côté client
    if (sortBy === 'nb_seances') {
      this.sortLocallyBySeances();
    } else {
      // Sinon, on recharge depuis l'API avec le nouveau tri
      this.loadModules();
    }
  }
  
  // Tri local par nombre de séances
  sortLocallyBySeances(): void {
    const multiplier = this.sortOrder === 'asc' ? 1 : -1;
    
    this.modules.sort((a, b) => {
      const seancesA = a.seances?.length || 0;
      const seancesB = b.seances?.length || 0;
      return (seancesA - seancesB) * multiplier;
    });
    
    console.log('Modules triés localement par nombre de séances');
  }

  getFilteredModules(): any[] {
    return this.modules;
  }
  // Créer un nouveau module
  createModule(moduleData: any): void {
    console.log('Tentative de création de module...');
    
    // Afficher les clés disponibles pour le debug
    if (moduleData instanceof FormData) {
      console.log('FormData contient les champs:', Array.from((moduleData as FormData).keys()));
      
      // Vérifier les données critiques
      const titre = moduleData.get('titre');
      const niveau = moduleData.get('niveau');
      const duree = moduleData.get('duree');
      const objectifs = moduleData.get('objectifs');
      const image = moduleData.get('image');
      
      console.log('Titre:', titre);
      console.log('Niveau:', niveau);
      console.log('Durée:', duree);
      console.log('Objectifs:', objectifs);
      console.log('Image présente:', !!image);
    }
    
    this.moduleService.createModule(moduleData).subscribe({
      next: (response: any) => {
        console.log('Module créé avec succès:', response);
        
        // Fermer le modal
        const modal = document.getElementById('newModuleModal');
        if (modal) {
          // @ts-ignore
          const bsModal = bootstrap.Modal.getInstance(modal);
          bsModal?.hide();
        }
        
        // Réinitialiser le formulaire
        this.moduleForm.reset({
          statut: 'brouillon',
          categorie_id: 1,
          type_seance_defaut: 'individuelle',
          duree_seance_defaut: 60,
          niveau: 'Débutant',
          duree: 1
        });
        
        // Réinitialiser les objectifs
        const objectifsArray = this.moduleForm.get('objectifs') as FormArray;
        objectifsArray.clear();
        objectifsArray.push(this.createObjectif());
        
        // Réinitialiser l'image
        this.selectedFile = null;
        this.imagePreview = null;
        
        this.notificationService.showSuccess('Module créé avec succès');
        this.loadModules();
      },
      error: (err: any) => {
        console.error('Erreur lors de la création du module:', err);
        let errorMessage = 'Erreur lors de la création du module';
        
        if (err.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.errors && Array.isArray(err.error.errors)) {
            // Traiter les erreurs de validation express-validator
            errorMessage = err.error.errors.map((e: any) => e.msg || e.message).join(', ');
          }
        }
        
        console.error('Message d\'erreur formaté:', errorMessage);
        this.notificationService.showError(`Erreur lors de la création du module: ${errorMessage}`);
      }
    });
  }  // Soumettre le formulaire
  onSubmitModuleForm(): void {
    if (this.moduleForm.invalid) {
      Object.keys(this.moduleForm.controls).forEach(key => {
        const control = this.moduleForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    // Créer un FormData pour envoyer les données et l'image
    const formData = new FormData();
    
    // Obtenir l'ID de l'utilisateur connecté
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userId = currentUser?.user?.id;
    
    if (!userId) {
      this.notificationService.showError('Impossible de créer le module: utilisateur non identifié');
      return;
    }
    
    // Ajout du champ created_by
    formData.append('created_by', userId.toString());
    
    // Champs principaux
    formData.append('titre', this.moduleForm.get('titre')?.value);
    formData.append('description', this.moduleForm.get('description')?.value);
    formData.append('statut', this.moduleForm.get('statut')?.value);
    formData.append('categorie_id', this.moduleForm.get('categorie_id')?.value);
    formData.append('type_seance_defaut', this.moduleForm.get('type_seance_defaut')?.value);
    formData.append('duree_seance_defaut', this.moduleForm.get('duree_seance_defaut')?.value);
    
    // Nouveaux champs
    formData.append('niveau', this.moduleForm.get('niveau')?.value);
    formData.append('duree', this.moduleForm.get('duree')?.value);
    
    // Ajouter les objectifs
    const objectifs = this.objectifs.controls.map((control: any) => control.get('description')?.value);
    formData.append('objectifs', JSON.stringify(objectifs));
    
    // Ajouter l'image si disponible
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
      // On ne définit pas image_url ici, le serveur le gère via le middleware d'upload
    }
    
    console.log('Données du module à créer:', Array.from(formData.entries()));
    
    this.createModule(formData);
  }

  // Mettre à jour un module
  updateModule(id: number, moduleData: any): void {
    this.moduleService.updateModule(id, moduleData).subscribe({
      next: (response: any) => {
        this.notificationService.showSuccess('Module mis à jour avec succès');
        this.loadModules();
      },
      error: (err: any) => {
        this.notificationService.showError(`Erreur lors de la mise à jour: ${err.error}`);
      }
    });
  }
  
  // Supprimer un module
  deleteModule(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce module ?')) {
      this.moduleService.deleteModule(id).subscribe({
        next: (response: any) => {
          this.notificationService.showSuccess('Module supprimé avec succès');
          this.loadModules();
        },
        error: (err: any) => {
          this.notificationService.showError(`Erreur lors de la suppression: ${err.error}`);
        }
      });
    }
  }

  // Dupliquer un module
  duplicateModule(id: number): void {
    this.moduleService.getModuleById(id).subscribe({
      next: (response: any) => {
        const moduleData = { ...response.module };
        delete moduleData.id;
        moduleData.titre = `${moduleData.titre} (copie)`;
        moduleData.statut = 'brouillon';
        
        this.moduleService.createModule(moduleData).subscribe({
          next: (createResponse: any) => {
            this.notificationService.showSuccess('Module dupliqué avec succès');
            this.loadModules();
          },
          error: (err: any) => {
            this.notificationService.showError(`Erreur lors de la duplication: ${err.error}`);
          }
        });
      },
      error: (err: any) => {
        this.notificationService.showError(`Erreur lors de la récupération du module: ${err.error}`);
      }
    });
  }
  
  // Prévisualiser un module
  previewModule(id: number): void {
    window.open(`/preview/module/${id}`, '_blank');
  }
  // Changer le statut d'un module
  changeModuleStatus(id: number, status: string): void {
    const statusFrench = status === 'publié' ? 'publier' : 'mettre en brouillon';
    if (confirm(`Êtes-vous sûr de vouloir ${statusFrench} ce module ?`)) {
      console.log(`Tentative de changement de statut du module ${id} à "${status}"`);
      
      this.moduleService.changeModuleStatus(id, status).subscribe({
        next: (response: any) => {
          console.log('Statut du module changé avec succès:', response);
          this.notificationService.showSuccess(`Module ${status === 'publié' ? 'publié' : 'mis en brouillon'} avec succès`);
          
          // Mise à jour locale du statut du module
          const moduleIndex = this.allModules.findIndex(m => m.id === id);
          if (moduleIndex !== -1) {
            this.allModules[moduleIndex].statut = status;
            // Réappliquer les filtres pour mettre à jour l'affichage
            this.applyFilters();
          } else {
            // Si le module n'est pas trouvé localement, recharger tous les modules
            this.loadModules();
          }
        },
        error: (err: any) => {
          console.error('Erreur lors du changement de statut du module:', err);
          let errorMessage = 'Erreur lors de la modification du statut';
          
          if (err.error) {
            if (typeof err.error === 'string') {
              errorMessage = err.error;
            } else if (err.error.message) {
              errorMessage = err.error.message;
            }
          }
          
          this.notificationService.showError(`Erreur lors de la modification du statut: ${errorMessage}`);
        }
      });
    }
  }

  // Méthodes pour gérer les objectifs
  createObjectif(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required]
    });
  }

  get objectifs(): FormArray {
    return this.moduleForm.get('objectifs') as FormArray;
  }

  addObjectif(): void {
    this.objectifs.push(this.createObjectif());
  }

  removeObjectif(index: number): void {
    if (this.objectifs.length > 1) {
      this.objectifs.removeAt(index);
    }
  }
  // Méthodes pour gérer l'image
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.files && target.files.length > 0) {
      const file = target.files[0];
      
      // Vérifier le type et la taille du fichier
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5 MB
      
      if (!validTypes.includes(file.type)) {
        this.notificationService.showError('Type de fichier non supporté. Utilisez JPG, PNG ou GIF.');
        this.removeImage();
        return;
      }
      
      if (file.size > maxSize) {
        this.notificationService.showError('L\'image est trop volumineuse (max: 5 Mo)');
        this.removeImage();
        return;
      }
      
      this.selectedFile = file;
      
      // Créer une prévisualisation de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    
    // Réinitialiser l'input file
    const fileInput = document.getElementById('moduleImage') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Fonction utilitaire pour formater les paramètres de requête (non utilisée avec filtrage local)
  private formatQueryParams(params: any): string {
    const queryParams = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return queryParams ? `?${queryParams}` : '';
  }

  // Méthode pour basculer vers les modules récupérés directement
  toggleDirectFetch(): void {
    this.useDirectFetch = !this.useDirectFetch;
    console.log('Mode fetch direct:', this.useDirectFetch);
    
    if (this.useDirectFetch && this.directFetchModules.length === 0) {
      // Si on active le mode mais qu'on n'a pas encore récupéré les modules, le faire maintenant
      this.testDirectApiCall().then(() => {
        if (this.directFetchModules.length > 0) {
          this.loadModules(); // Recharger avec les modules récupérés
        }
      });
    } else {
      // Sinon, recharger simplement avec la méthode appropriée
      this.loadModules();
    }
  }

  // Test direct de l'API
  async testDirectApiCall(): Promise<void> {
    try {
      const token = this.authService.getToken() || '';
      const currentUserId = this.authService.currentUserValue?.user?.id;
      
      console.log('TEST DIRECT - Utilisateur courant ID:', currentUserId);
      console.log('TEST DIRECT - Utilisateur admin:', this.authService.isAdmin());
      console.log('TEST DIRECT - Utilisation du token:', token?.substring(0, 15) + '...');

      // Test avec un paramètre spécial pour ignorer les filtres au niveau du backend
      const apiUrl = `${environment.apiUrl}/modules?sortBy=date_creation&sortOrder=desc&debug=true&noFilter=true`;
      console.log('TEST DIRECT - URL de l\'API:', apiUrl);

      // Afficher tous les détails de la requête
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      console.log('TEST DIRECT - Headers:', headers);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        console.error('TEST DIRECT - Erreur HTTP:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('TEST DIRECT - Réponse API brute:', data);
      console.log('TEST DIRECT - Nombre de modules:', data?.modules?.length || 0);
      
      if (data.modules) {
        // Stocker les modules pour utilisation ultérieure
        this.directFetchModules = data.modules;
        
        console.log('TEST DIRECT - Détail des modules:');
        data.modules.forEach((module: any, index: number) => {
          console.log(`Module ${index + 1}:`, {
            id: module.id,
            titre: module.titre,
            statut: module.statut,
            modules_users: module.modules_users ? 'présent' : 'absent'
          });
        });
      }
    } catch (error) {
      console.error('TEST DIRECT - Erreur:', error);
    }
  }

  // Charger un module pour l'édition
  editModule(id: number): void {
    this.isEditMode = true;
    this.currentModuleId = id;
    
    // Réinitialiser l'image
    this.imagePreview = null;
    this.selectedFile = null;
    
    // Récupérer les données du module depuis l'API
    this.moduleService.getModuleById(id).subscribe({
      next: (response: any) => {
        const module = response.module;
        
        console.log('Module à éditer:', module);
        
        // Réinitialiser le formulaire
        this.resetModuleForm();
        
        // Remplir le formulaire avec les données du module
        this.moduleForm.patchValue({
          titre: module.titre,
          description: module.description || '',
          statut: module.statut,
          categorie_id: module.categorie_id || 1,
          type_seance_defaut: module.type_seance_defaut || 'individuelle',
          duree_seance_defaut: module.duree_seance_defaut || 60,
          niveau: module.niveau || 'Débutant',
          duree: module.duree || 1
        });
        
        // Sauvegarder l'URL de l'image actuelle
        this.currentModuleImageUrl = module.image_url ? this.getModuleImageFullUrl(module.image_url) : null;
        
        // Gérer les objectifs
        if (module.objectifs) {
          try {
            const objectifsArray = this.moduleForm.get('objectifs') as FormArray;
            let objectifs = [];
            
            // Vérifier si les objectifs sont déjà au format JSON ou s'ils sont une chaîne de caractères
            if (typeof module.objectifs === 'string') {
              try {
                objectifs = JSON.parse(module.objectifs);
              } catch (e) {
                // Si ce n'est pas du JSON valide, utiliser comme une seule chaîne
                objectifs = [module.objectifs];
              }
            } else if (Array.isArray(module.objectifs)) {
              objectifs = module.objectifs;
            }
            
            // Vider le tableau existant
            objectifsArray.clear();
            
            // Ajouter chaque objectif
            objectifs.forEach((objectif: any) => {
              const desc = typeof objectif === 'string' ? objectif : objectif.description;
              objectifsArray.push(this.fb.group({
                description: [desc, Validators.required]
              }));
            });
            
            // Si aucun objectif n'a été ajouté, ajouter un groupe vide
            if (objectifsArray.length === 0) {
              objectifsArray.push(this.createObjectif());
            }
          } catch (e) {
            console.error('Erreur lors du traitement des objectifs:', e);
            // En cas d'erreur, ajouter un groupe vide
            const objectifsArray = this.moduleForm.get('objectifs') as FormArray;
            objectifsArray.clear();
            objectifsArray.push(this.createObjectif());
          }
        }
        
        // Ouvrir le modal d'édition
        const modal = document.getElementById('editModuleModal');
        if (modal) {
          // @ts-ignore
          const bsModal = new bootstrap.Modal(modal);
          bsModal.show();
        }
      },
      error: (err: any) => {
        this.notificationService.showError(`Erreur lors de la récupération du module: ${err.error}`);
      }
    });
  }

  // Soumettre le formulaire d'édition
  onSubmitEditModuleForm(): void {
    if (this.moduleForm.invalid || !this.currentModuleId) {
      Object.keys(this.moduleForm.controls).forEach(key => {
        const control = this.moduleForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    // Créer un FormData pour envoyer les données et l'image
    const formData = new FormData();
    
    // Champs principaux
    formData.append('titre', this.moduleForm.get('titre')?.value);
    formData.append('description', this.moduleForm.get('description')?.value);
    formData.append('statut', this.moduleForm.get('statut')?.value);
    formData.append('categorie_id', this.moduleForm.get('categorie_id')?.value);
    formData.append('type_seance_defaut', this.moduleForm.get('type_seance_defaut')?.value);
    formData.append('duree_seance_defaut', this.moduleForm.get('duree_seance_defaut')?.value);
    
    // Nouveaux champs
    formData.append('niveau', this.moduleForm.get('niveau')?.value);
    formData.append('duree', this.moduleForm.get('duree')?.value);
    
    // Ajouter les objectifs
    const objectifs = this.objectifs.controls.map((control: any) => control.get('description')?.value);
    formData.append('objectifs', JSON.stringify(objectifs));
    
    // Ajouter l'image si disponible
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }
    
    console.log('Données du module à mettre à jour:', Array.from(formData.entries()));
    
    // Mettre à jour le module
    this.updateModuleWithFormData(this.currentModuleId, formData);
  }

  // Réinitialiser le formulaire
  resetModuleForm(): void {
    this.moduleForm.reset({
      statut: 'brouillon',
      categorie_id: 1,
      type_seance_defaut: 'individuelle',
      duree_seance_defaut: 60,
      niveau: 'Débutant',
      duree: 1
    });
    
    // Réinitialiser les objectifs
    const objectifsArray = this.moduleForm.get('objectifs') as FormArray;
    objectifsArray.clear();
    objectifsArray.push(this.createObjectif());
    
    // Réinitialiser l'image
    this.selectedFile = null;
    this.imagePreview = null;
    this.currentModuleImageUrl = null;
  }

  // Mettre à jour un module avec FormData
  updateModuleWithFormData(id: number, moduleData: FormData): void {
    this.moduleService.updateModule(id, moduleData).subscribe({
      next: (response: any) => {
        console.log('Module mis à jour avec succès:', response);
        
        // Fermer le modal
        const modal = document.getElementById('editModuleModal');
        if (modal) {
          // @ts-ignore
          const bsModal = bootstrap.Modal.getInstance(modal);
          bsModal?.hide();
        }
        
        this.notificationService.showSuccess('Module mis à jour avec succès');
        
        // Réinitialiser les états
        this.isEditMode = false;
        this.currentModuleId = null;
        this.currentModuleImageUrl = null;
        
        // Recharger les modules
        this.loadModules();
      },
      error: (err: any) => {
        console.error('Erreur lors de la mise à jour du module:', err);
        let errorMessage = 'Erreur lors de la mise à jour du module';
        
        if (err.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.errors && Array.isArray(err.error.errors)) {
            errorMessage = err.error.errors.map((e: any) => e.msg || e.message).join(', ');
          }
        }
        
        this.notificationService.showError(`Erreur lors de la mise à jour: ${errorMessage}`);
      }
    });
  }

  // Ouvrir le modal pour gérer les séances d'un module
  addSeanceToModule(moduleId: number): void {
    this.currentModuleId = moduleId;
    this.selectedSeances = [];
    this.activeTab = 'current'; // Commencer par l'onglet des séances actuelles
    this.loadModuleSeances(moduleId);
    this.loadAvailableSeances();
    
    // Ouvrir le modal
    const modal = document.getElementById('addSeancesModal');
    if (modal) {
      // @ts-ignore
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    }
  }
  
  // Charger les séances du module
  loadModuleSeances(moduleId: number): void {
    if (!moduleId) return;
    
    // Trouver le module dans la liste des modules
    const moduleItem = this.modules.find(m => m.id === moduleId);
    if (moduleItem && moduleItem.seances) {
      this.moduleSeances = [...moduleItem.seances];
      console.log(`Séances chargées pour le module ${moduleId}:`, this.moduleSeances);
    } else {
      // Si le module n'est pas trouvé dans la liste, faire une requête API
      this.moduleService.getModuleById(moduleId).subscribe({
        next: (response) => {
          this.moduleSeances = response.module.seances || [];
          console.log(`Séances chargées depuis l'API pour le module ${moduleId}:`, this.moduleSeances);
        },
        error: (err) => {
          console.error(`Erreur lors du chargement des séances pour le module ${moduleId}:`, err);
          this.notificationService.showError('Impossible de charger les séances du module');
        }
      });
    }
  }
  
  // Supprimer une séance du module
  removeSeanceFromModule(moduleId: number, seanceId: number): void {
    if (!moduleId || !seanceId) return;
    
    this.moduleService.removeSeanceFromModule(moduleId, seanceId).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('Séance supprimée du module avec succès');
        // Mettre à jour la liste des séances du module
        this.loadModuleSeances(moduleId);
        // Recharger la liste des modules pour refléter les changements
        this.loadModules();
      },
      error: (err) => {
        console.error('Erreur lors de la suppression de la séance:', err);
        this.notificationService.showError('Erreur lors de la suppression de la séance du module');
      }
    });
  }
  
  // Charger les séances disponibles
  loadAvailableSeances(): void {
    this.loadingSeances = true;
    
    this.seanceService.getAllSeances().subscribe({
      next: (response: any) => {
        this.availableSeances = response.seances || [];
        this.loadingSeances = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des séances disponibles', err);
        this.notificationService.showError('Impossible de charger les séances disponibles');
        this.loadingSeances = false;
      }
    });
  }
  
  // Changer l'onglet actif
  setActiveTab(tab: 'available' | 'current'): void {
    this.activeTab = tab;
  }
  
  // Filtrer les séances disponibles par recherche
  getFilteredAvailableSeances(): any[] {
    if (!this.seanceSearchQuery.trim()) {
      return this.availableSeances;
    }
    
    const query = this.seanceSearchQuery.toLowerCase().trim();
    return this.availableSeances.filter(seance => 
      seance.titre.toLowerCase().includes(query) || 
      (seance.description && seance.description.toLowerCase().includes(query))
    );
  }
  
  // Ajouter/supprimer une séance de la sélection
  toggleSeanceSelection(seanceId: number): void {
    const index = this.selectedSeances.indexOf(seanceId);
    if (index === -1) {
      this.selectedSeances.push(seanceId);
    } else {
      this.selectedSeances.splice(index, 1);
    }
  }
  
  // Vérifier si une séance est sélectionnée
  isSeanceSelected(seanceId: number): boolean {
    return this.selectedSeances.includes(seanceId);
  }
  
  // Sauvegarder les séances sélectionnées
  saveSelectedSeances(): void {
    if (!this.currentModuleId || this.selectedSeances.length === 0) {
      this.notificationService.showError('Veuillez sélectionner au moins une séance');
      return;
    }
    
    this.moduleService.addSeancesToModule(this.currentModuleId, this.selectedSeances).subscribe({
      next: (response: any) => {
        // Mettre à jour les séances du module
        this.loadModuleSeances(this.currentModuleId as number);
        
        // Réinitialiser la sélection
        this.selectedSeances = [];
        
        this.notificationService.showSuccess('Séances ajoutées au module avec succès');
        
        // Changer l'onglet pour voir les séances actuelles
        this.setActiveTab('current');
        
        // Mettre à jour la liste des modules pour refléter les changements
        this.loadModules();
      },
      error: (err: any) => {
        console.error('Erreur lors de l\'ajout des séances', err);
        this.notificationService.showError('Erreur lors de l\'ajout des séances au module');
      }
    });
  }

  /**
   * Retourne l'URL complète de l'image du module
   * @param imagePath Chemin de l'image relatif
   * @returns URL complète de l'image
   */
  getModuleImageFullUrl(imagePath: string | null | undefined): string {
    return this.moduleImageService.getModuleImageUrl(imagePath);
  }
}
