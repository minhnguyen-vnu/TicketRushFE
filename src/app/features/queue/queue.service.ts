import { Injectable, inject } from '@angular/core';
import { Observable, interval, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { QueueStatus } from '../../core/models/queue.model';

@Injectable({ providedIn: 'root' })
export class QueueService {
  private readonly api = inject(ApiService);

  joinQueue(eventId: string): Observable<QueueStatus> {
    return this.api.post<QueueStatus>(`/api/queue/join/${eventId}`, {});
  }

  getQueueStatus(eventId: string): Observable<QueueStatus> {
    return this.api.get<QueueStatus>(`/api/queue/status/${eventId}`);
  }

  pollQueueStatus(eventId: string, intervalMs = 3000): Observable<QueueStatus> {
    return interval(intervalMs).pipe(switchMap(() => this.getQueueStatus(eventId)));
  }
}
