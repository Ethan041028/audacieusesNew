import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, User } from '../../services/user.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule]
})
export class UserProfileComponent implements OnInit {
  userId: number = 0;
  user: User | null = null;
  loading: boolean = true;
  error: string | null = null;
  
  // Formulaire pour modifier les informations de l'utilisateur
  userForm: FormGroup;
  isEditing: boolean = false;
  
  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      date_naissance: [''],
      telephone: [''],
      adresse: [''],
      code_postal: [''],
      ville: [''],
      pays: ['']
    });
  }

  ngOnInit(): void {
    // Récupérer l'ID de l'utilisateur depuis l'URL
    this.route.params.subscribe(params => {
      this.userId = +params['id']; // Convertir en nombre
      this.loadUserDetails();
    });
  }

  loadUserDetails(): void {
    this.loading = true;
    this.error = null;
    
    this.userService.getUserById(this.userId).subscribe({
      next: (response) => {
        this.user = response.user;
        this.loading = false;
        
        // Préremplir le formulaire avec les données de l'utilisateur
        this.userForm.patchValue({
          prenom: this.user.prenom,
          nom: this.user.nom,
          email: this.user.email,
          date_naissance: this.user.date_naissance,
          telephone: this.user.telephone || '',
          adresse: this.user.adresse || '',
          code_postal: this.user.code_postal || '',
          ville: this.user.ville || '',
          pays: this.user.pays || ''
        });
      },
      error: (err) => {
        console.error('Erreur lors du chargement des détails de l\'utilisateur', err);
        this.error = 'Impossible de charger les détails de l\'utilisateur. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }

  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    
    if (!this.isEditing) {
      // Réinitialiser le formulaire avec les valeurs originales
      this.userForm.patchValue({
        prenom: this.user?.prenom,
        nom: this.user?.nom,
        email: this.user?.email,
        date_naissance: this.user?.date_naissance,
        telephone: this.user?.telephone || '',
        adresse: this.user?.adresse || '',
        code_postal: this.user?.code_postal || '',
        ville: this.user?.ville || '',
        pays: this.user?.pays || ''
      });
    }
  }

  saveUserDetails(): void {
    if (this.userForm.invalid || !this.user) return;
    
    const userData = { ...this.userForm.value };
    
    // Adapter le champ email à mail pour le backend
    if (userData.email) {
      userData.mail = userData.email;
      delete userData.email;
    }
    
    this.userService.updateUser(this.userId, userData).subscribe({
      next: (response) => {
        // Mettre à jour les données locales
        this.user = { ...this.user!, ...response.user };
        
        // Désactiver le mode édition
        this.isEditing = false;
        
        // Afficher un message de succès
        alert(response.message || 'Profil mis à jour avec succès');
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du profil', err);
        alert(`Erreur: ${err.error}`);
      }
    });
  }
} 