import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminEventService } from '../admin-event.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EventListItem, EventStatus } from '../../../../core/models/event.model';
import { of } from 'rxjs';
import { catchError } from 'rxjs/internal/operators/catchError';
import { EventService } from '../../../events/event.service';

@Component({
  selector: 'app-admin-event-list',
  templateUrl: './admin-event-list.component.html',
  imports: [RouterLink],
})
export class AdminEventListComponent implements OnInit {
  private readonly adminEventService = inject(AdminEventService);
  private readonly eventService = inject(EventService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly events = signal<EventListItem[]>([]);
  readonly confirmDelete = signal(false);
  readonly deleting = signal(false);
  readonly pendingDelete = signal<EventListItem | null>(null);

  readonly EventStatus = EventStatus;

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);
    this.adminEventService
      .getEvents()
      .pipe(
        catchError(() => {
          this.error.set('Failed to load events.');
          this.loading.set(false);
          return of([]);
        }),
      )
      .subscribe(events => {
        this.events.set(events);
        this.loading.set(false);
      });
  }

  onEventSelected(event: EventListItem): void {
    this.eventService.setSelectedEvent(event);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }

  onTogglePublish(event: EventListItem): void {
    const newStatus =
      event.status === EventStatus.PUBLISHED ? EventStatus.DRAFT : EventStatus.PUBLISHED;
    this.events.update(events =>
      events.map(e => (e.id === event.id ? { ...e, status: newStatus } : e)),
    );
    this.adminEventService.updateEvent(event.id, { status: newStatus }).subscribe({
      next: () =>
        this.toast.success(
          newStatus === EventStatus.PUBLISHED ? 'Event published.' : 'Event unpublished.',
        ),
      error: () => {
        this.loadEvents();
        this.toast.error('Failed to update event.');
      },
    });
  }

  onDelete(event: EventListItem): void {
    this.pendingDelete.set(event);
    this.confirmDelete.set(true);
  }

  cancelDelete(): void {
    this.confirmDelete.set(false);
    this.pendingDelete.set(null);
  }

  confirmDeleteAction(): void {
    const target = this.pendingDelete();
    if (!target) return;
    this.deleting.set(true);
    this.adminEventService.deleteEvent(target.id).subscribe({
      next: () => {
        this.events.update(events => events.filter(e => e.id !== target.id));
        this.toast.success('Event deleted.');
        this.deleting.set(false);
        this.cancelDelete();
      },
      error: () => {
        this.toast.error('Failed to delete event.');
        this.deleting.set(false);
      },
    });
  }
}
