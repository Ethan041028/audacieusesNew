import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, User } from '../../services/user.service';

// Interface étendant User pour ajouter les propriétés nécessaires
interface UserWithSelection extends User {
  selected: boolean;
  active?: boolean;
}

// Service temporaire si le service officiel n'existe pas encore
class RoleService {
  getAllRoles() {
    return {
      subscribe: (callbacks: any) => {
        // Rôles avec les IDs réels de la base de données
        callbacks.next({ roles: [
          { id: 1, nom: 'admin' },
          { id: 2, nom: 'admin_plus' },
          { id: 3, nom: 'coach' },
          { id: 4, nom: 'client' }
        ]});
      }
    };
  }
}

// Déclaration pour éviter l'erreur bootstrap
declare var bootstrap: any;

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, FormsModule, ReactiveFormsModule],
  providers: [RoleService]
})
export class UsersComponent implements OnInit, AfterViewInit {
  users: UserWithSelection[] = [];
  loading = true;
  error: string | null = null;
  searchQuery = '';
  selectedFilter = 'all'; // 'all', 'admin', 'client', 'inactive'
  selectedUsers: number[] = [];
  selectAll = false;
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  
  // Formulaires
  editingUser: User | null = null;
  userForm: FormGroup;
  newUserForm: FormGroup;
  
  // Rôles
  roles: any[] = [];
  
  // Modals
  private editUserModal: any;
  
  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private fb: FormBuilder
  ) { 
    // Initialisation des formulaires
    this.userForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role_id: [null, Validators.required],
      active: [true]
    });
    
    this.newUserForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role_id: [null, Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }
  
  ngAfterViewInit(): void {
    // Initialiser les modals après un court délai pour s'assurer que le DOM est chargé
    setTimeout(() => {
      try {
        this.editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du modal:', error);
      }
    }, 100);
  }
  
  loadRoles(): void {
    this.roleService.getAllRoles().subscribe({
      next: (response: any) => {
        this.roles = response.roles || [];
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des rôles', err);
      }
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    const options: any = {
      page: this.currentPage,
      limit: this.itemsPerPage
    };
    
    if (this.searchQuery) {
      options.search = this.searchQuery;
    }
    
    if (this.selectedFilter !== 'all') {
      options.status = this.selectedFilter === 'inactive' ? 'inactive' : 'active';
      if (this.selectedFilter !== 'inactive') {
        options.role = this.selectedFilter;
      }
    }
    
    this.userService.getAllUsers(options).subscribe({
      next: (response) => {
        // Ajouter la propriété selected à chaque utilisateur
        this.users = (response.users || []).map(user => ({
          ...user,
          selected: this.selectedUsers.includes(user.id),
          active: user.status === 'active'
        }));
        this.totalPages = Math.ceil(response.total / this.itemsPerPage);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs', err);
        this.error = 'Impossible de charger les utilisateurs. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }

  // Recherche
  search(): void {
    this.currentPage = 1;
    this.loadUsers();
  }
  
  // Filtre
  applyFilter(filter: string): void {
    this.selectedFilter = filter;
    this.currentPage = 1;
    this.loadUsers();
  }
  
  // Pagination
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadUsers();
  }
  
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;
      
      if (endPage > this.totalPages) {
        endPage = this.totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }
  
  // Sélection utilisateurs
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.selectedUsers = this.users.map(user => user.id);
      this.users.forEach(user => user.selected = true);
    } else {
      this.selectedUsers = [];
      this.users.forEach(user => user.selected = false);
    }
  }
  
  toggleSelectUser(userId: number): void {
    const index = this.selectedUsers.indexOf(userId);
    if (index === -1) {
      this.selectedUsers.push(userId);
    } else {
      this.selectedUsers.splice(index, 1);
    }
    
    // Mettre à jour la propriété selected de chaque utilisateur
    this.users.forEach(user => {
      if (user.id === userId) {
        user.selected = !user.selected;
      }
    });
    
    // Vérifier si tous les utilisateurs sont sélectionnés
    this.selectAll = this.selectedUsers.length === this.users.length;
  }
  
  isSelected(userId: number): boolean {
    return this.selectedUsers.includes(userId);
  }
  
  // Actions utilisateurs
  viewUserProfile(userId: number): void {
    // Cette méthode n'a pas besoin d'implémentation car les liens utilisent RouterLink
  }
  
  editUser(user: User): void {
    this.editingUser = user;
    
    this.userForm.patchValue({
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      role_id: user.role?.id,
      active: user.status === 'active'
    });
    
    try {
      if (this.editUserModal) {
        this.editUserModal.show();
      } else {
        console.warn('Modal non initialisé');
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
      }
    } catch (error) {
      console.error('Erreur lors de l\'affichage du modal:', error);
    }
  }
  
  saveUser(): void {
    if (this.userForm.invalid || !this.editingUser) return;
    
    const userData = { ...this.userForm.value };
    
    // Adapter le champ email à mail pour le backend
    if (userData.email) {
      userData.mail = userData.email;
      delete userData.email;
    }
    
    // Obtenir le nom du rôle à partir de l'ID et l'ajouter comme role_type pour le backend
    if (userData.role_id) {
      const selectedRole = this.roles.find(r => r.id === parseInt(userData.role_id.toString()));
      if (selectedRole) {
        userData.role_type = selectedRole.nom;
      }
    }
    
    console.log('Données d\'utilisateur à mettre à jour:', userData);
    
    this.userService.updateUser(this.editingUser.id, userData).subscribe({
      next: (response: any) => {
        console.log('Utilisateur mis à jour:', response);
        
        // Mettre à jour l'utilisateur dans la liste
        const index = this.users.findIndex(u => u.id === this.editingUser!.id);
        if (index !== -1) {
          this.users[index] = { ...this.users[index], ...response.user, selected: this.users[index].selected };
        }
        
        try {
          if (this.editUserModal) {
            this.editUserModal.hide();
          }
        } catch (error) {
          console.error('Erreur lors de la fermeture du modal:', error);
        }
        
        alert(response.message || 'Utilisateur mis à jour avec succès');
      },
      error: (err: any) => {
        console.error('Erreur lors de la mise à jour de l\'utilisateur', err);
        alert(`Erreur: ${err.error}`);
      }
    });
  }
  
  createUser(): void {
    if (this.newUserForm.invalid) return;
    
    const userData = { ...this.newUserForm.value };
    
    // Adapter le champ email à mail pour le backend
    if (userData.email) {
      userData.mail = userData.email;
      delete userData.email;
    }
    
    // Adapter le champ password à mdp pour le backend
    if (userData.password) {
      userData.mdp = userData.password;
      delete userData.password;
    }
    
    // Obtenir le nom du rôle à partir de l'ID et l'ajouter comme role_type pour le backend
    if (userData.role_id) {
      const selectedRole = this.roles.find(r => r.id === parseInt(userData.role_id.toString()));
      if (selectedRole) {
        userData.role_type = selectedRole.nom;
      }
    }
    
    console.log('Données d\'utilisateur à envoyer:', userData);
    
    this.userService.createUser(userData).subscribe({
      next: (response: any) => {
        console.log('Utilisateur créé:', response);
        
        this.loadUsers(); // Recharger la liste des utilisateurs
        this.newUserForm.reset(); // Réinitialiser le formulaire
        
        // Fermer le modal
        try {
          const modal = document.getElementById('newUserModal');
          if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
          }
        } catch (error) {
          console.error('Erreur lors de la fermeture du modal:', error);
        }
        
        alert(response.message || 'Utilisateur créé avec succès');
      },
      error: (err: any) => {
        console.error('Erreur lors de la création de l\'utilisateur', err);
        alert(`Erreur: ${err.error}`);
      }
    });
  }
  
  deleteUser(userId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.userService.deleteUser(userId).subscribe({
        next: (response) => {
          alert(response.message);
          this.loadUsers();
        },
        error: (err) => {
          alert(`Erreur: ${err.error}`);
        }
      });
    }
  }
  
  deleteSelectedUsers(): void {
    if (this.selectedUsers.length === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${this.selectedUsers.length} utilisateur(s) ?`)) {
      // Utiliser Promise.all pour faire des suppressions en parallèle
      Promise.all(
        this.selectedUsers.map(userId => 
          new Promise((resolve, reject) => {
            this.userService.deleteUser(userId).subscribe({
              next: () => resolve(userId),
              error: (err) => reject(err)
            });
          })
        )
      ).then(() => {
        alert('Utilisateurs supprimés avec succès');
        this.selectedUsers = [];
        this.selectAll = false;
        this.loadUsers();
      }).catch(err => {
        alert(`Une erreur est survenue: ${err.error}`);
      });
    }
  }
  
  deactivateSelectedUsers(): void {
    if (this.selectedUsers.length === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir désactiver ${this.selectedUsers.length} utilisateur(s) ?`)) {
      Promise.all(
        this.selectedUsers.map(userId => 
          new Promise((resolve, reject) => {
            this.userService.changeUserStatus(userId, 'inactive').subscribe({
              next: () => resolve(userId),
              error: (err) => reject(err)
            });
          })
        )
      ).then(() => {
        alert('Utilisateurs désactivés avec succès');
        this.loadUsers();
      }).catch(err => {
        alert(`Une erreur est survenue: ${err.error}`);
      });
    }
  }
  
  resetPassword(userId: number): void {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser le mot de passe de cet utilisateur ?')) {
      this.userService.resetUserPassword(userId).subscribe({
        next: (response) => {
          alert(response.message || 'Mot de passe réinitialisé avec succès');
        },
        error: (err) => {
          alert(`Erreur: ${err.error}`);
        }
      });
    }
  }
  
  // Formatage des données
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }
  
  getStatusLabel(user: User): string {
    if (!user.role) return '';
    
    if (user.role.role_type === 'admin' || user.role.role_type === 'admin_plus') {
      return 'Admin';
    } else if (user.role.role_type === 'client' && user.progression !== undefined && user.progression > 0) {
      return 'Bénéficiaire';
    } else {
      return 'Utilisatrice';
    }
  }
  
  getStatusClass(user: User): string {
    if (!user.role) return '';
    
    if (user.role.role_type === 'admin' || user.role.role_type === 'admin_plus') {
      return 'status-admin';
    } else if (user.role.role_type === 'client' && user.progression !== undefined && user.progression > 0) {
      return 'status-beneficiaire';
    } else {
      return 'status-utilisatrice';
    }
  }
  
  // Méthode pour générer la classe CSS du cercle de progression
  getProgressCircleClass(progression: number): string {
    if (progression === 0) return 'circle-outline';
    if (progression < 25) return 'circle-low';
    if (progression < 50) return 'circle-medium';
    if (progression < 75) return 'circle-good';
    return 'circle-excellent';
  }
}
