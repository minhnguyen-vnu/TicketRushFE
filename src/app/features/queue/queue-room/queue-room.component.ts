import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { QueueStatus } from '../../../core/models/queue.model';
import { ToastService } from '../../../core/services/toast.service';
import { QueueService } from '../queue.service';

@Component({
  selector: 'app-queue-room',
  templateUrl: './queue-room.component.html',
})
export class QueueRoomComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queueService = inject(QueueService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly status = signal<QueueStatus | null>(null);
  readonly error = signal('');
  readonly sessionCountdown = signal(0);
  readonly activeUsers = computed(() => this.status()?.active_users ?? 0);
  readonly maxActiveUsers = computed(() => this.status()?.max_active_users ?? 0);
  readonly canSelectSeats = computed(() => this.status()?.has_access ?? false);
  readonly notice = computed(() => this.status()?.notice ?? '');

  protected eventId = '';
  private pollSub: Subscription | null = null;
  private sessionTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.eventId = this.route.snapshot.queryParamMap.get('eventId') ?? '';
    if (!this.eventId) {
      this.error.set('Missing event id.');
      this.loading.set(false);
      return;
    }

    this.queueService.joinQueue(this.eventId).subscribe({
      next: result => {
        this.applyStatus(result);
        this.loading.set(false);
        this.startPolling();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Unable to join the queue. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = this.queueService.pollQueueStatus(this.eventId, 3000).subscribe({
      next: result => this.applyStatus(result),
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.error.set(err.error?.error ?? 'Event has ended.');
          this.loading.set(false);
          return;
        }
        this.toast.error('Lost connection to the queue.');
      },
    });
  }

  private applyStatus(result: QueueStatus): void {
    const previous = this.status();
    this.status.set(result);
    if (result.session_expires_in != null) {
      this.startSessionCountdown(result.session_expires_in);
    } else {
      this.stopSessionCountdown();
    }

    if (!previous?.has_access && result.has_access) {
      this.toast.success('Access granted!');
      void this.router.navigate(['/events', this.eventId]);
    } else if (previous?.has_access && !result.has_access && result.notice) {
      this.toast.error(result.notice);
    }
  }

  private startSessionCountdown(seconds: number): void {
    this.sessionCountdown.set(seconds);
    if (this.sessionTimer) clearInterval(this.sessionTimer);
    this.sessionTimer = setInterval(() => {
      const next = this.sessionCountdown() - 1;
      this.sessionCountdown.set(Math.max(0, next));
      if (next <= 0) {
        this.stopSessionCountdown();
        this.queueService.getQueueStatus(this.eventId).subscribe({
          next: result => this.applyStatus(result),
          error: () => this.toast.error('Could not refresh queue access state.'),
        });
      }
    }, 1000);
  }

  private stopSessionCountdown(): void {
    this.sessionCountdown.set(0);
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  formatCountdown(): string {
    const s = this.sessionCountdown();
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  retry(): void {
    this.error.set('');
    this.loading.set(true);
    this.ngOnInit();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.stopSessionCountdown();
  }
}
