import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { DashboardData } from '../../../core/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ws = inject(WebSocketService);

  readonly dashboardUpdates$ = this.ws.dashboardUpdates$;

  getDashboardSnapshot(eventId: string): Observable<DashboardData> {
    return this.api.get<DashboardData>(`/api/admin/dashboard/${eventId}`);
  }

  connectDashboardWS(eventId: string): void {
    const token = localStorage.getItem('token') ?? '';
    this.ws.connectDashboard(eventId, token);
  }

  disconnect(): void {
    this.ws.disconnect();
  }
}
