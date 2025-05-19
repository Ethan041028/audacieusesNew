import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, Validators, FormArray, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ModuleService } from '../../services/module.service';

interface Module {
  id: number;
  titre: string;
  description: string;
  niveau: string;
  duree: number;
  objectifs: string[];
  image_url?: string;
}

interface ModuleResponse {
  module: Module;
  message?: string;
}

@Component({
  selector: 'app-module-form',
  templateUrl: './module-form.component.html',
  styleUrls: ['./module-form.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink]
})
export class ModuleFormComponent implements OnInit {
  moduleForm!: FormGroup;
  isEditMode = false;
  moduleId: number = 0;
  loading = false;
  submitting = false;
  error: string | null = null;
  success: string | null = null;
  imagePreview: string | null = null;
  
  niveauxModules = ['Débutant', 'Intermédiaire', 'Avancé'];

  constructor(
    private fb: FormBuilder,
    private moduleService: ModuleService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initForm();

    // Vérifier si nous sommes en mode édition (avec un ID de module)
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.moduleId = +params['id'];
        this.loadModuleDetails();
      }
    });
  }

  initForm(): void {
    this.moduleForm = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      image: [null],
      niveau: ['Débutant', Validators.required],
      duree: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      objectifs: this.fb.array([this.createObjectif()])
    });
  }

  loadModuleDetails(): void {
    this.loading = true;
    this.error = null;

    this.moduleService.getModuleById(this.moduleId).subscribe({
      next: (data: ModuleResponse) => {
        const module = data.module;
        
        // Remplacer les objectifs actuels par ceux du module
        const objectifsArray = this.moduleForm.get('objectifs') as FormArray;
        objectifsArray.clear();
        
        if (module.objectifs && module.objectifs.length > 0) {
          module.objectifs.forEach(objectif => {
            objectifsArray.push(this.fb.group({
              description: [objectif, Validators.required]
            }));
          });
        } else {
          objectifsArray.push(this.createObjectif());
        }
        
        // Mettre à jour le formulaire
        this.moduleForm.patchValue({
          titre: module.titre,
          description: module.description,
          niveau: module.niveau,
          duree: module.duree
        });
        
        // Si une image existe
        if (module.image_url) {
          this.imagePreview = module.image_url;
        }
        
        this.loading = false;
      },
      error: (err) => {
        this.error = `Erreur lors du chargement du module: ${err.message}`;
        this.loading = false;
      }
    });
  }

  // Gérer les objectifs (FormArray)
  get objectifs(): FormArray {
    return this.moduleForm.get('objectifs') as FormArray;
  }

  createObjectif(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required]
    });
  }

  addObjectif(): void {
    this.objectifs.push(this.createObjectif());
  }

  removeObjectif(index: number): void {
    if (this.objectifs.length > 1) {
      this.objectifs.removeAt(index);
    }
  }

  // Gérer l'upload d'image
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.moduleForm.patchValue({ image: file });
      
      // Afficher un aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // Soumettre le formulaire
  onSubmit(): void {
    if (this.moduleForm.invalid) {
      this.markFormGroupTouched(this.moduleForm);
      return;
    }

    this.submitting = true;
    this.error = null;
    this.success = null;

    // Extraire les valeurs du formulaire
    const moduleData = new FormData();
    moduleData.append('titre', this.moduleForm.get('titre')!.value);
    moduleData.append('description', this.moduleForm.get('description')!.value);
    moduleData.append('niveau', this.moduleForm.get('niveau')!.value);
    moduleData.append('duree', this.moduleForm.get('duree')!.value);
    
    // Ajouter les objectifs
    const objectifs = this.objectifs.controls.map(control => control.get('description')!.value);
    moduleData.append('objectifs', JSON.stringify(objectifs));
    
    // Ajouter l'image si présente
    const imageFile = this.moduleForm.get('image')!.value;
    if (imageFile) {
      moduleData.append('image', imageFile);
    }

    // Appel API différent selon le mode (création ou édition)
    const apiCall = this.isEditMode 
      ? this.moduleService.updateModule(this.moduleId, moduleData)
      : this.moduleService.createModule(moduleData);

    apiCall.subscribe({
      next: (response) => {
        this.submitting = false;
        this.success = this.isEditMode
          ? 'Module mis à jour avec succès!'
          : 'Module créé avec succès!';
        
        setTimeout(() => {
          this.router.navigate(['/admin/modules']);
        }, 1500);
      },
      error: (err) => {
        this.submitting = false;
        this.error = `Erreur lors de l'${this.isEditMode ? 'édition' : 'ajout'} du module: ${err.message}`;
      }
    });
  }

  // Utilitaire pour marquer tous les champs comme touchés
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(ctrl => {
          if (ctrl instanceof FormGroup) {
            this.markFormGroupTouched(ctrl);
          } else {
            ctrl.markAsTouched();
          }
        });
      }
    });
  }
}
