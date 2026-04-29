import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { EventListItem, Event } from '../../../core/models/event.model';

@Injectable({ providedIn: 'root' })
export class AdminEventService {
  private readonly api = inject(ApiService);

  getEvents(): Observable<EventListItem[]> {
    return this.api.get<EventListItem[]>(`/api/admin/events`);
  }

  getEvent(eventId: string): Observable<Event> {
    return this.api.get<Event>(`/api/admin/events/${eventId}`);
  }

  updateEvent(eventId: string, data: Partial<{ status: 'PUBLISHED' | 'DRAFT' }>): Observable<void> {
    return this.api.put<void>(`/api/admin/events/${eventId}`, data);
  }

  deleteEvent(eventId: string): Observable<void> {
    return this.api.delete<void>(`/api/admin/events/${eventId}`);
  }
}