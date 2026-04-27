import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { CheckoutResponse } from '../../core/models/checkout.model';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly api = inject(ApiService);

  private readonly resultSubject = new BehaviorSubject<CheckoutResponse | null>(null);
  readonly result$ = this.resultSubject.asObservable();

  checkout(eventId: string, seatIds: string[]): Observable<CheckoutResponse> {
    return this.api
      .post<CheckoutResponse>('/api/checkout', { event_id: eventId, seat_ids: seatIds })
      .pipe(tap(res => this.resultSubject.next(res)));
  }

  getLastResult(): CheckoutResponse | null {
    return this.resultSubject.getValue();
  }

  clearResult(): void {
    this.resultSubject.next(null);
  }
}
