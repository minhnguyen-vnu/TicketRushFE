import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { EventListItem, Event, EventCategory } from '../../../core/models/event.model';
import { SeatZone } from '../../../core/models/seat-zone.model';

export interface CreateZonePayload {
  name: string;
  rows: number;
  cols: number;
  price: number;
  color: string;
  capacity?: number;
}

export interface CreateEventPayload {
  title: string;
  slug?: string;
  description: string;
  short_description: string;
  start_time: string;
  end_time: string;
  venue: string;
  banner_url: string;
  is_private: boolean;
  theme: string;
  status: string;
  categories: EventCategory[];
  category_ids?: string[];
  zones: CreateZonePayload[];
  seating_type: 'ASSIGNED' | 'GENERAL_ADMISSION';
  ticket_type: 'FREE' | 'PAID';
}

@Injectable({ providedIn: 'root' })
export class AdminEventService {
  private readonly api = inject(ApiService);

  getEvents(): Observable<EventListItem[]> {
    return this.api.get<EventListItem[]>(`/api/admin/events`);
  }

  getEvent(eventId: string): Observable<Event> {
    return this.api.get<Event>(`/api/events/${eventId}`);
  }

  createEvent(payload: CreateEventPayload): Observable<Event> {
    return this.api.post<Event>(`/api/admin/events`, payload);
  }

  updateEvent(eventId: string, data: Partial<CreateEventPayload>): Observable<Event> {
    return this.api.put<Event>(`/api/admin/events/${eventId}`, data);
  }

  deleteEvent(eventId: string): Observable<{ deleted: boolean }> {
    return this.api.delete<{ deleted: boolean }>(`/api/admin/events/${eventId}`);
  }

  getZones(eventId: string): Observable<SeatZone[]> {
    return this.api.get<SeatZone[]>(`/api/admin/events/${eventId}/zones`);
  }

  createZone(eventId: string, payload: CreateZonePayload): Observable<SeatZone> {
    return this.api.post<SeatZone>(`/api/admin/events/${eventId}/zones`, payload);
  }
}
