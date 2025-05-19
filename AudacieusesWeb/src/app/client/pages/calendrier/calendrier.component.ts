import { Component, OnInit, ViewChild, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EvenementService } from '../../../services/evenement.service';
import { AuthService } from '../../../services/auth.service';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Subscription } from 'rxjs';
import { FullCalendarModule } from '@fullcalendar/angular';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RappelsComponent } from './rappels.component';

// Interface générique pour le service modal
interface ModalService {
  open(content: any, options?: any): any;
  dismissAll(): void;
}

@Component({
  selector: 'app-client-calendrier',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    FullCalendarModule,
    NgbModule,
    RappelsComponent
  ],
  templateUrl: './calendrier.component.html',
  styleUrls: ['./calendrier.component.scss']
})
export class ClientCalendrierComponent implements OnInit, OnDestroy {
  currentUser: any;
  events: any[] = [];
  selectedEvent: any = null;
  calendarOptions: CalendarOptions;
  eventForm: FormGroup;
  private subscriptions: Subscription[] = [];
  loading = {
    events: false,
    saving: false,
    deleting: false
  };
  error: {
    events: string | null,
    saving: string | null,
    deleting: string | null
  } = {
    events: null,
    saving: null,
    deleting: null
  };
  
  @ViewChild('eventModal') eventModal: any;
  @ViewChild('confirmDeleteModal') confirmDeleteModal: any;

  constructor(
    private evenementService: EvenementService,
    private authService: AuthService,
    private fb: FormBuilder,
    @Inject('ModalService') private modalService: ModalService
  ) {
    this.eventForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      date_debut: ['', Validators.required],
      date_fin: ['', Validators.required],
      lieu: ['', Validators.maxLength(100)],
      type: ['evenement', Validators.required],
      rappel: [true],
      temps_rappel: [15, [Validators.min(1), Validators.max(1440)]],
      couleur: ['#3788d8']
    });
    
    // Initialisation des options du calendrier
    this.calendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
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
      events: [],
      select: this.handleDateSelect.bind(this),
      eventClick: this.handleEventClick.bind(this),
      eventDrop: this.handleEventDrop.bind(this),
      eventResize: this.handleEventResize.bind(this)
    };
  }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue.user;
    this.loadEvents();
  }
  
  ngOnDestroy(): void {
    // Désabonnement de toutes les souscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadEvents(): void {
    this.loading.events = true;
    this.error.events = null;
    
    // Récupérer les événements de l'utilisateur
    const sub = this.evenementService.getUserEvenements().subscribe({
      next: (response: any) => {
        // Combiner les événements créés par l'utilisateur et ceux auxquels il participe
        const allEvents = [
          ...response.evenementsCreateur.map((event: any) => this.mapEventToCalendar(event, 'creator')),
          ...response.evenementsParticipant.map((event: any) => this.mapEventToCalendar(event, 'participant'))
        ];
        
        this.events = allEvents;
        
        // Mettre à jour les événements du calendrier
        this.calendarOptions.events = this.events;
        
        this.loading.events = false;
      },
      error: (error: any) => {
        this.error.events = `Erreur lors du chargement des événements: ${error.message || 'Erreur inconnue'}`;
        this.loading.events = false;
      }
    });
    
    this.subscriptions.push(sub);
  }

  mapEventToCalendar(event: any, role: string): any {
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
        rappel: event.rappel,
        temps_rappel: event.temps_rappel,
        role: role, // 'creator' ou 'participant'
        createur: event.createur,
        seance: event.seance
      }
    };
  }

  handleDateSelect(selectInfo: any): void {
    const modalRef = this.modalService.open(this.eventModal, { centered: true });
    
    // Pré-remplir les dates sélectionnées
    this.eventForm.patchValue({
      date_debut: this.formatDate(selectInfo.start),
      date_fin: this.formatDate(selectInfo.end)
    });
    
    this.selectedEvent = null;
  }

  handleEventClick(clickInfo: any): void {
    const eventId = clickInfo.event.id;
    
    const sub = this.evenementService.getEvenementById(eventId).subscribe({
      next: (evenement) => {
        this.selectedEvent = evenement;
        
        // Pré-remplir le formulaire avec les détails de l'événement
        this.eventForm.patchValue({
          titre: this.selectedEvent.titre,
          description: this.selectedEvent.description || '',
          date_debut: this.formatDate(this.selectedEvent.date_debut),
          date_fin: this.formatDate(this.selectedEvent.date_fin),
          lieu: this.selectedEvent.lieu || '',
          type: this.selectedEvent.type,
          rappel: this.selectedEvent.rappel,
          temps_rappel: this.selectedEvent.temps_rappel,
          couleur: this.selectedEvent.couleur
        });
        
        const modalRef = this.modalService.open(this.eventModal, { centered: true });
      },
      error: (error) => {
        console.error('Erreur lors de la récupération de l\'événement:', error);
        this.error.events = `Erreur lors de la récupération de l'événement: ${error.message || 'Erreur inconnue'}`;
      }
    });
    
    this.subscriptions.push(sub);
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
    const sub = this.evenementService.updateEvenement(eventId, {
      date_debut: start.toISOString(),
      date_fin: end.toISOString()
    }).subscribe({
      next: () => {
        // Mise à jour réussie
        this.loadEvents(); // Recharger les événements
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour des dates:', error);
        this.error.events = `Erreur lors de la mise à jour des dates: ${error.message || 'Erreur inconnue'}`;
        this.loadEvents(); // Recharger quand même pour revenir à l'état précédent
      }
    });
    
    this.subscriptions.push(sub);
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
    
    if (this.selectedEvent) {
      // Mise à jour d'un événement existant
      const sub = this.evenementService.updateEvenement(this.selectedEvent.id, eventData).subscribe({
        next: () => {
          this.loading.saving = false;
          this.modalService.dismissAll();
          this.loadEvents(); // Recharger les événements
          this.resetForm();
        },
        error: (error) => {
          this.error.saving = `Erreur lors de la mise à jour de l'événement: ${error.message || 'Erreur inconnue'}`;
          this.loading.saving = false;
        }
      });
      
      this.subscriptions.push(sub);
    } else {
      // Création d'un nouvel événement
      const sub = this.evenementService.createEvenement(eventData).subscribe({
        next: () => {
          this.loading.saving = false;
          this.modalService.dismissAll();
          this.loadEvents(); // Recharger les événements
          this.resetForm();
        },
        error: (error) => {
          this.error.saving = `Erreur lors de la création de l'événement: ${error.message || 'Erreur inconnue'}`;
          this.loading.saving = false;
        }
      });
      
      this.subscriptions.push(sub);
    }
  }

  confirmDelete(): void {
    if (!this.selectedEvent) return;
    
    const modalRef = this.modalService.open(this.confirmDeleteModal, { centered: true });
  }

  deleteEvent(): void {
    if (!this.selectedEvent) return;
    
    this.loading.deleting = true;
    this.error.deleting = null;
    
    const sub = this.evenementService.deleteEvenement(this.selectedEvent.id).subscribe({
      next: () => {
        this.loading.deleting = false;
        this.modalService.dismissAll();
        this.loadEvents(); // Recharger les événements
        this.resetForm();
      },
      error: (error) => {
        this.error.deleting = `Erreur lors de la suppression de l'événement: ${error.message || 'Erreur inconnue'}`;
        this.loading.deleting = false;
      }
    });
    
    this.subscriptions.push(sub);
  }

  resetForm(): void {
    this.eventForm.reset({
      type: 'evenement',
      rappel: true,
      temps_rappel: 15,
      couleur: '#3788d8'
    });
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

  isCreator(): boolean {
    return this.selectedEvent && this.selectedEvent.createur_id === this.currentUser.id;
  }

  canEdit(): boolean {
    return !this.selectedEvent || this.isCreator();
  }
}