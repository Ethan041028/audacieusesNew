import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ModuleService } from '../../services/module.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-modules',
  templateUrl: './modules.component.html',
  styleUrls: ['./modules.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule]
})
export class ModulesComponent implements OnInit {
  modules: any[] = [];
  loading = true;
  error: string | null = null;
  filter = 'all'; // 'all', 'published', 'draft'
  searchQuery = '';
  sortBy = 'date_creation';
  sortOrder = 'desc';
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  
  // Formulaire pour la création et l'édition de module
  moduleForm: FormGroup;
  categories: any[] = [
    { id: 1, nom: 'Orientation professionnelle' },
    { id: 2, nom: 'Développement personnel' },
    { id: 3, nom: 'Compétences techniques' }
  ];

  constructor(
    private moduleService: ModuleService,
    private fb: FormBuilder,
    private notificationService: NotificationService
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
    this.loadModules();
    
    // Réinitialiser le formulaire lorsque le modal est fermé
    const modalElement = document.getElementById('newModuleModal');
    if (modalElement) {
      modalElement.addEventListener('hidden.bs.modal', () => {
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
      });
    }
  }

  loadModules(): void {
    this.loading = true;
    this.error = null;
    
    const options: any = {
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };
    
    if (this.searchQuery) {
      options.search = this.searchQuery;
    }
    
    if (this.filter !== 'all') {
      options.status = this.filter;
    }
    
    this.moduleService.getAllModules(options).subscribe({
      next: (response: any) => {
        this.modules = response.modules || [];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des modules', err);
        this.error = 'Impossible de charger les modules. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }

  // Recherche de modules
  searchModules(): void {
    this.loadModules();
  }

  // Filtrer les modules
  filterModules(filter: string): void {
    this.filter = filter;
    this.loadModules();
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
    this.loadModules();
  }

  getFilteredModules(): any[] {
    return this.modules;
  }
  
  // Créer un nouveau module
  createModule(moduleData: any): void {
    this.moduleService.createModule(moduleData).subscribe({
      next: (response: any) => {
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
        this.notificationService.showError(`Erreur lors de la création du module: ${err.error}`);
      }
    });
  }

  // Soumettre le formulaire
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
      this.moduleService.changeModuleStatus(id, status).subscribe({
        next: (response: any) => {
          this.notificationService.showSuccess(`Module ${status === 'publié' ? 'publié' : 'mis en brouillon'} avec succès`);
          this.loadModules();
        },
        error: (err: any) => {
          this.notificationService.showError(`Erreur lors de la modification du statut: ${err.error}`);
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
  }
}
