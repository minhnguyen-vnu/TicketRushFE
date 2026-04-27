import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SeatStatusEvent } from '../models/seat.model';
import { DashboardData } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private currentUrl = '';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  private readonly seatUpdatesSubject = new Subject<SeatStatusEvent>();
  private readonly dashboardUpdatesSubject = new Subject<DashboardData>();

  readonly seatUpdates$ = this.seatUpdatesSubject.asObservable();
  readonly dashboardUpdates$ = this.dashboardUpdatesSubject.asObservable();

  connectSeatMap(eventId: string): void {
    this.open(`${environment.wsUrl}/api/ws/events/${eventId}`);
  }

  connectDashboard(eventId: string, token: string): void {
    this.open(`${environment.wsUrl}/api/ws/admin/dashboard/${eventId}?token=${token}`);
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnect();
    this.reconnectAttempts = 0;
    this.currentUrl = '';
    this.ws?.close();
    this.ws = null;
  }

  private open(url: string): void {
    this.intentionalClose = false;
    this.currentUrl = url;
    this.ws?.close();
    this.ws = new WebSocket(url);

    this.ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data as string);
        if (msg.type === 'seat_status_changed') {
          this.seatUpdatesSubject.next(msg as SeatStatusEvent);
        } else if (msg.type === 'dashboard_update') {
          this.dashboardUpdatesSubject.next(msg as DashboardData);
        }
      } catch { /* ignore malformed frames */ }
    };

    this.ws.onclose = () => {
      if (!this.intentionalClose) this.scheduleReconnect();
    };

    this.ws.onerror = () => { this.ws?.close(); };
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.open(this.currentUrl), delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
