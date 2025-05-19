import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, User, UsersResponse } from '../../services/user.service';

// Interface pour les utilisateurs
interface UserWithModules extends User {
  modules?: any[];
}

// Services temporaires si les services officiels n'existent pas encore
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

class ModuleService {
  // Service temporaire
}

declare var bootstrap: any; // Pour utiliser les modals Bootstrap

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, FormsModule, ReactiveFormsModule],
  providers: [RoleService, ModuleService] // Fournir les services temporaires
})
export class ClientsComponent implements OnInit, AfterViewInit {
  users: UserWithModules[] = [];
  roles: any[] = [];
  loading = true;
  error: string | null = null;
  searchQuery = '';
  selectedFilter = 'all'; // 'all', 'client', 'admin', 'admin_plus'
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  
  // Édition utilisateur
  editingUser: User | null = null;
  userForm: FormGroup;
  newUserForm: FormGroup;
  
  // Modules utilisateur
  selectedUserForModules: User | null = null;
  userModules: any[] = [];
  loadingModules = false;
  moduleError: string | null = null;
  
  // Modal references
  private editUserModal: any;
  private userModulesModal: any;
  
  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private moduleService: ModuleService,
    private fb: FormBuilder
  ) {
    // Initialisation des formulaires
    this.userForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role_id: [null, Validators.required]
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
    // Initialiser les références aux modals Bootstrap
    this.editUserModal = new bootstrap.Modal(document.getElementById('editClientModal'));
    this.userModulesModal = new bootstrap.Modal(document.getElementById('userModulesModal'));
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
      options.role = this.selectedFilter;
    }
    
    this.userService.getAllUsers(options).subscribe({
      next: (response: UsersResponse) => {
        this.users = response.users || [];
        this.totalPages = Math.ceil(response.total / this.itemsPerPage);
        this.loading = false;
        
        console.log('Utilisateurs chargés:', this.users);
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des utilisateurs', err);
        this.error = 'Impossible de charger les utilisateurs. Veuillez réessayer.';
        this.loading = false;
      }
    });
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
  
  // Édition utilisateur
  editUser(user: User): void {
    this.editingUser = user;
    
    this.userForm.patchValue({
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      role_id: user.role?.id
    });
    
    this.editUserModal.show();
  }
  
  saveUser(): void {
    if (this.userForm.invalid || !this.editingUser) return;
    
    const userData = { ...this.userForm.value };
    
    // Adapter les champs pour le backend
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
          this.users[index] = { ...this.users[index], ...response.user };
        }
        
        this.editUserModal.hide();
        alert(response.message || 'Utilisateur mis à jour avec succès');
      },
      error: (err: any) => {
        console.error('Erreur lors de la mise à jour de l\'utilisateur', err);
        alert(`Erreur: ${err.error}`);
      }
    });
  }
  
  // Création utilisateur
  createUser(): void {
    if (this.newUserForm.invalid) return;
    
    const userData = { ...this.newUserForm.value };
    
    // Adapter les champs pour le backend
    if (userData.email) {
      userData.mail = userData.email;
      delete userData.email;
    }
    
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
        const modal = document.getElementById('newClientModal');
        if (modal) {
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) bsModal.hide();
        }
        
        alert(response.message || 'Utilisateur créé avec succès');
      },
      error: (err: any) => {
        console.error('Erreur lors de la création de l\'utilisateur', err);
        alert(`Erreur: ${err.error}`);
      }
    });
  }
  
  // Réinitialisation mot de passe
  resetPassword(userId: number): void {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser le mot de passe de cet utilisateur ?')) {
      this.userService.resetUserPassword(userId).subscribe({
        next: (response: any) => {
          alert(response.message || 'Mot de passe réinitialisé avec succès');
        },
        error: (err: any) => {
          console.error('Erreur lors de la réinitialisation du mot de passe', err);
          alert(`Erreur: ${err.error}`);
        }
      });
    }
  }
  
  // Gestion des modules
  viewUserModules(userId: number): void {
    this.loadingModules = true;
    this.moduleError = null;
    this.userModules = [];
    
    // Trouver l'utilisateur sélectionné
    this.selectedUserForModules = this.users.find(u => u.id === userId) || null;
    
    if (!this.selectedUserForModules) {
      this.moduleError = 'Utilisateur non trouvé';
      return;
    }
    
    // Charger les modules de l'utilisateur
    this.userService.getUserModules(userId).subscribe({
      next: (response: any) => {
        this.userModules = response.modules || [];
        this.loadingModules = false;
        console.log('Modules de l\'utilisateur:', this.userModules);
        
        // Ouvrir le modal
        this.userModulesModal.show();
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des modules de l\'utilisateur', err);
        this.moduleError = 'Impossible de charger les modules. Veuillez réessayer.';
        this.loadingModules = false;
      }
    });
  }
  
  assignModule(): void {
    if (!this.selectedUserForModules) return;
    
    // Implémentation à faire pour l'attribution d'un module à un client
    alert('Fonctionnalité d\'attribution de module en cours de développement.');
  }
} 