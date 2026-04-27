import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Event, EventListItem } from '../../core/models/event.model';
import { SeatMapResponse } from '../../core/models/seat-map.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly api = inject(ApiService);

  getEvents(params?: {
    search?: string;
    date_from?: string;
    date_to?: string;
  }): Observable<EventListItem[]> {
    const qp = new URLSearchParams();
    if (params?.search) qp.set('search', params.search);
    if (params?.date_from) qp.set('date_from', params.date_from);
    if (params?.date_to) qp.set('date_to', params.date_to);
    const qs = qp.toString();
    return this.api.get<EventListItem[]>(`/api/events${qs ? `?${qs}` : ''}`);
  }

  getEventById(id: string): Observable<Event> {
    return this.api.get<Event>(`/api/events/${id}`);
  }

  getEventSeats(eventId: string): Observable<SeatMapResponse> {
    return this.api.get<SeatMapResponse>(`/api/events/${eventId}/seats`);
  }
}
