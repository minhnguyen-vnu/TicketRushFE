import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminEventService } from '../admin-event.service';
import { EventListItem, Event as EventModel } from '../../../../core/models/event.model';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { catchError } from 'rxjs/internal/operators/catchError';

@Component({
  selector: 'app-admin-event-list',
  templateUrl: './admin-event-list.component.html',
  imports: [RouterLink],
})
export class AdminEventListComponent {
  private readonly adminEventService = inject(AdminEventService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly events = signal<EventListItem[]>([]);
  readonly confirmDelete = signal(false);
  readonly deleting = signal(false);

  constructor() {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);
    this.adminEventService.getEvents()
      .pipe(
        catchError(err => {
          this.error.set('Failed to load events.');
          this.loading.set(false);
          return of([]);
        })
      )
      .subscribe(events => {
        this.events.set(events);
        this.loading.set(false);
      });
  }

  formatDate(dateStr: string): string { return ''; }

  onTogglePublish(event: EventListItem): void {}

  onDelete(event: EventListItem): void {}

  cancelDelete(): void {}

  confirmDeleteAction(): void {}
}
