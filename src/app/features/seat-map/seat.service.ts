import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { Seat, SeatHoldResponse } from '../../core/models/seat.model';
import { SeatMapResponse, SeatMapZone } from '../../core/models/seat-map.model';
import { EventService } from '../events/event.service';

@Injectable({ providedIn: 'root' })
export class SeatService {
  private readonly api = inject(ApiService);
  private readonly eventService = inject(EventService);

  private readonly selectedSeatsSubject = new BehaviorSubject<Seat[]>([]);
  readonly selectedSeats$ = this.selectedSeatsSubject.asObservable();

  private cachedZones: SeatMapZone[] = [];
  private cachedEventId = '';

  getSeatMap(eventId: string): Observable<SeatMapResponse> {
    return this.eventService.getEventSeats(eventId).pipe(
      tap(res => {
        this.cachedZones = res.zones;
        this.cachedEventId = eventId;
      }),
    );
  }

  getCachedZones(): SeatMapZone[] {
    return this.cachedZones;
  }

  getCachedEventId(): string {
    return this.cachedEventId;
  }

  holdSeat(seatId: string, eventId: string): Observable<SeatHoldResponse> {
    return this.api.post<SeatHoldResponse>(`/api/seats/${seatId}/hold`, { event_id: eventId });
  }

  releaseSeat(seatId: string, eventId: string): Observable<{ message: string }> {
    return this.api.deleteWithBody<{ message: string }>(`/api/seats/${seatId}/hold`, {
      event_id: eventId,
    });
  }

  addSelected(seat: Seat): void {
    const current = this.selectedSeatsSubject.getValue();
    if (!current.some(s => s.id === seat.id)) {
      this.selectedSeatsSubject.next([...current, seat]);
    }
  }

  removeSelected(seatId: string): void {
    this.selectedSeatsSubject.next(
      this.selectedSeatsSubject.getValue().filter(s => s.id !== seatId),
    );
  }

  clearSelected(): void {
    this.selectedSeatsSubject.next([]);
  }

  getSelectedSeats(): Seat[] {
    return this.selectedSeatsSubject.getValue();
  }
}
