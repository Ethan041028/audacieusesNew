import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EvenementService } from '../../../services/evenement.service';
import { AuthService } from '../../../services/auth.service';
import { UserService, UsersResponse } from '../../services/user.service';
// Remplacer NgbModal par une interface plus générique pour l'instant
interface ModalService {
  open(content: any, options?: any): any;
  dismissAll(): void;
}

@Component({
  selector: 'app-admin-calendrier',
  templateUrl: './calendrier.component.html',
  styleUrls: ['./calendrier.component.scss']
})
export class AdminCalendrierComponent implements OnInit {
  currentUser: any;
  events: any[] = [];
  users: any[] = [];
  selectedEvent: any = null;
  calendarOptions: any;
  eventForm: FormGroup;
  participantsForm: FormGroup;
  loading = {
    events: false,
    users: false,
    saving: false,
    deleting: false
  };
  error: {
    events: string | null,
    users: string | null,
    saving: string | null,
    deleting: string | null
  } = {
    events: null,
    users: null,
    saving: null,
    deleting: null
  };
  
  @ViewChild('eventModal') eventModal: any;
  @ViewChild('participantsModal') participantsModal: any;
  @ViewChild('confirmDeleteModal') confirmDeleteModal: any;

  constructor(
    private evenementService: EvenementService,
    private authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder,
    // Utilisez l'injection par token pour éviter l'erreur d'injection
    @Inject('ModalService') private modalService: ModalService
  ) {
    this.eventForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      date_debut: ['', Validators.required],
      date_fin: ['', Validators.required],
      lieu: ['', Validators.maxLength(100)],
      type: ['evenement', Validators.required],
      statut: ['planifie', Validators.required],
      rappel: [true],
      temps_rappel: [15, [Validators.min(1), Validators.max(1440)]],
      couleur: ['#3788d8'],
      prive: [false],
      seance_id: [null]
    });
    
    this.participantsForm = this.fb.group({
      participants: [[]]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue.user;
    this.loadEvents();
    this.loadUsers();
    
    this.calendarOptions = {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
      },
      weekends: true,
      editable: true,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: true,
      locale: 'fr',
      events: this.events,
      select: this.handleDateSelect.bind(this),
      eventClick: this.handleEventClick.bind(this),
      eventDrop: this.handleEventDrop.bind(this),
      eventResize: this.handleEventResize.bind(this)
    };
  }

  loadEvents(): void {
    this.loading.events = true;
    this.error.events = null;
    
    // En tant qu'admin, récupérer tous les événements
    this.evenementService.getAllEvenements().subscribe({
      next: (response: any) => {
        this.events = response.evenements.map((event: any) => this.mapEventToCalendar(event));
        
        // Mettre à jour les événements du calendrier
        this.calendarOptions.events = this.events;
        
        this.loading.events = false;
      },
      error: (error: any) => {
        this.error.events = `Erreur lors du chargement des événements: ${error.error}`;
        this.loading.events = false;
      }
    });
  }
  
  loadUsers(): void {
    this.loading.users = true;
    this.error.users = null;
    
    this.userService.getAllUsers().subscribe({
      next: (response: UsersResponse) => {
        this.users = response.users;
        this.loading.users = false;
      },
      error: (error: any) => {
        this.error.users = `Erreur lors du chargement des utilisateurs: ${error.error}`;
        this.loading.users = false;
      }
    });
  }

  mapEventToCalendar(event: any): any {
    return {
      id: event.id,
      title: event.titre,
      start: event.date_debut,
      end: event.date_fin,
      description: event.description,
      location: event.lieu,
      color: event.couleur,
      extendedProps: {
        type: event.type,
        statut: event.statut,
        rappel: event.rappel,
        temps_rappel: event.temps_rappel,
        prive: event.prive,
        createur: event.createur,
        seance: event.seance,
        participants: event.participants
      }
    };
  }

  handleDateSelect(selectInfo: any): void {
    const modalRef = this.modalService.open(this.eventModal, { centered: true, size: 'lg' });
    
    // Pré-remplir les dates sélectionnées
    this.eventForm.patchValue({
      date_debut: this.formatDate(selectInfo.start),
      date_fin: this.formatDate(selectInfo.end)
    });
    
    this.selectedEvent = null;
  }

  handleEventClick(clickInfo: any): void {
    const eventId = clickInfo.event.id;
    
    this.evenementService.getEvenementById(eventId).subscribe({
      next: (response) => {
        this.selectedEvent = response.evenement;
        
        // Pré-remplir le formulaire avec les détails de l'événement
        this.eventForm.patchValue({
          titre: this.selectedEvent.titre,
          description: this.selectedEvent.description || '',
          date_debut: this.formatDate(this.selectedEvent.date_debut),
          date_fin: this.formatDate(this.selectedEvent.date_fin),
          lieu: this.selectedEvent.lieu || '',
          type: this.selectedEvent.type,
          statut: this.selectedEvent.statut,
          rappel: this.selectedEvent.rappel,
          temps_rappel: this.selectedEvent.temps_rappel,
          couleur: this.selectedEvent.couleur,
          prive: this.selectedEvent.prive,
          seance_id: this.selectedEvent.seance_id
        });
        
        // Préparer le formulaire de participants
        if (this.selectedEvent.participants) {
          const participantIds = this.selectedEvent.participants.map((p: any) => p.id);
          this.participantsForm.patchValue({ participants: participantIds });
        }
        
        const modalRef = this.modalService.open(this.eventModal, { centered: true, size: 'lg' });
      },
      error: (error) => {
        console.error('Erreur lors de la récupération de l\'événement:', error);
      }
    });
  }

  handleEventDrop(changeInfo: any): void {
    const eventId = changeInfo.event.id;
    const newStart = changeInfo.event.start;
    const newEnd = changeInfo.event.end || new Date(newStart.getTime() + 1 * 60 * 60 * 1000); // Par défaut +1h si pas de fin
    
    this.updateEventDates(eventId, newStart, newEnd);
  }

  handleEventResize(resizeInfo: any): void {
    const eventId = resizeInfo.event.id;
    const newStart = resizeInfo.event.start;
    const newEnd = resizeInfo.event.end;
    
    this.updateEventDates(eventId, newStart, newEnd);
  }

  updateEventDates(eventId: number, start: Date, end: Date): void {
    this.evenementService.updateEvenement(eventId, {
      date_debut: start.toISOString(),
      date_fin: end.toISOString()
    }).subscribe({
      next: () => {
        // Mise à jour réussie
        this.loadEvents(); // Recharger les événements
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour des dates:', error);
        this.loadEvents(); // Recharger quand même pour revenir à l'état précédent
      }
    });
  }

  saveEvent(): void {
    if (this.eventForm.invalid) return;
    
    this.loading.saving = true;
    this.error.saving = null;
    
    const eventData = {
      ...this.eventForm.value,
      date_debut: new Date(this.eventForm.value.date_debut).toISOString(),
      date_fin: new Date(this.eventForm.value.date_fin).toISOString()
    };
    
    // Ajouter les participants s'ils sont sélectionnés
    if (this.participantsForm.value.participants && this.participantsForm.value.participants.length > 0) {
      eventData.participants = this.participantsForm.value.participants;
    }
    
    if (this.selectedEvent) {
      // Mise à jour d'un événement existant
      this.evenementService.updateEvenement(this.selectedEvent.id, eventData).subscribe({
        next: () => {
          this.loading.saving = false;
          this.modalService.dismissAll();
          this.loadEvents(); // Recharger les événements
          this.resetForm();
        },
        error: (error) => {
          this.error.saving = `Erreur lors de la mise à jour de l'événement: ${error.error}`;
          this.loading.saving = false;
        }
      });
    } else {
      // Création d'un nouvel événement
      this.evenementService.createEvenement(eventData).subscribe({
        next: () => {
          this.loading.saving = false;
          this.modalService.dismissAll();
          this.loadEvents(); // Recharger les événements
          this.resetForm();
        },
        error: (error) => {
          this.error.saving = `Erreur lors de la création de l'événement: ${error.error}`;
          this.loading.saving = false;
        }
      });
    }
  }

  openParticipantsModal(): void {
    const modalRef = this.modalService.open(this.participantsModal, { centered: true });
  }

  confirmDelete(): void {
    if (!this.selectedEvent) return;
    
    const modalRef = this.modalService.open(this.confirmDeleteModal, { centered: true });
  }

  deleteEvent(): void {
    if (!this.selectedEvent) return;
    
    this.loading.deleting = true;
    this.error.deleting = null;
    
    this.evenementService.deleteEvenement(this.selectedEvent.id).subscribe({
      next: () => {
        this.loading.deleting = false;
        this.modalService.dismissAll();
        this.loadEvents(); // Recharger les événements
        this.resetForm();
      },
      error: (error) => {
        this.error.deleting = `Erreur lors de la suppression de l'événement: ${error.error}`;
        this.loading.deleting = false;
      }
    });
  }

  resetForm(): void {
    this.eventForm.reset({
      type: 'evenement',
      statut: 'planifie',
      rappel: true,
      temps_rappel: 15,
      couleur: '#3788d8',
      prive: false
    });
    this.participantsForm.reset({ participants: [] });
    this.selectedEvent = null;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  getStatusClass(statut: string): string {
    switch (statut) {
      case 'planifie':
        return 'badge-info';
      case 'confirme':
        return 'badge-success';
      case 'annule':
        return 'badge-danger';
      case 'complete':
        return 'badge-secondary';
      default:
        return 'badge-primary';
    }
  }

  // Formater la date pour l'affichage
  formatDateDisplay(date: string): string {
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}