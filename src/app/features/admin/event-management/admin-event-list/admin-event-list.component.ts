import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Event as EventModel } from '../../../../core/models/event.model';

@Component({
  selector: 'app-admin-event-list',
  templateUrl: './admin-event-list.component.html',
  imports: [RouterLink],
})
export class AdminEventListComponent {
  readonly loading = signal(false);
  readonly error = signal('');
  readonly events = signal<EventModel[]>([]);
  readonly confirmDelete = signal(false);
  readonly deleting = signal(false);

  formatDate(dateStr: string): string { return ''; }

  onTogglePublish(event: EventModel): void {}

  onDelete(event: EventModel): void {}

  cancelDelete(): void {}

  confirmDeleteAction(): void {}
}
