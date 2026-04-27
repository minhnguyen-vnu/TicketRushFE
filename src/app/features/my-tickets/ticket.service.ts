import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { TicketDetailResponse } from '../../core/models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly api = inject(ApiService);

  getMyTickets(): Observable<TicketDetailResponse[]> {
    return this.api.get<TicketDetailResponse[]>('/api/my-tickets');
  }

  getTicket(id: string): Observable<TicketDetailResponse> {
    return this.api.get<TicketDetailResponse>(`/api/tickets/${id}`);
  }
}
