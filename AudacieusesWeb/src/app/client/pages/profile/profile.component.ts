import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { UserService, User } from '../../../admin/services/user.service';

// Interface pour le profil utilisateur avec bio supplémentaire
interface UserProfile {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  bio: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  userProfile: UserProfile = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    bio: ''
  };
  passwordForm: any = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  loading = {
    profile: false,
    password: false
  };
  success = {
    profile: false,
    password: false
  };
  error: {
    profile: string | null,
    password: string | null
  } = {
    profile: null,
    password: null
  };
  
  constructor(
    private authService: AuthService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue?.user;
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.loading.profile = true;
    this.error.profile = null;
    
    if (!this.currentUser) {
      this.error.profile = 'Utilisateur non connecté';
      this.loading.profile = false;
      return;
    }
    
    this.userService.getUserById(this.currentUser.id).subscribe({
      next: (response) => {
        const user = response.user;
        // Considérer user comme un objet générique pour pouvoir accéder à des propriétés non typées
        const userData: any = user;
        
        this.userProfile = {
          nom: user.nom || '',
          prenom: user.prenom || '',
          email: user.email || '',
          telephone: user.telephone || '',
          bio: userData.bio || '' // Accès à bio via l'objet any
        };
        this.loading.profile = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du profil', err);
        this.error.profile = 'Impossible de charger les informations de profil';
        this.loading.profile = false;
      }
    });
  }

  updateProfile(): void {
    this.loading.profile = true;
    this.success.profile = false;
    this.error.profile = null;
    
    if (!this.currentUser) {
      this.error.profile = 'Utilisateur non connecté';
      this.loading.profile = false;
      return;
    }
    
    this.userService.updateUser(this.currentUser.id, this.userProfile).subscribe({
      next: (response) => {
        this.success.profile = true;
        this.loading.profile = false;
        
        // Mettre à jour les informations de l'utilisateur actuel
        const updatedUser = { ...this.currentUser, ...response.user };
        this.authService.updateCurrentUserData(updatedUser);
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du profil', err);
        this.error.profile = 'Impossible de mettre à jour le profil';
        this.loading.profile = false;
      }
    });
  }
  
  changePassword(): void {
    // Vérifier que les mots de passe correspondent
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.error.password = 'Les mots de passe ne correspondent pas';
      return;
    }
    
    this.loading.password = true;
    this.success.password = false;
    this.error.password = null;
    
    this.authService.changePassword(
      this.passwordForm.currentPassword,
      this.passwordForm.newPassword
    ).subscribe({
      next: (response) => {
        this.success.password = true;
        this.loading.password = false;
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
      },
      error: (err) => {
        console.error('Erreur lors du changement de mot de passe', err);
        this.error.password = err.error || 'Impossible de changer le mot de passe';
        this.loading.password = false;
      }
    });
  }
}
