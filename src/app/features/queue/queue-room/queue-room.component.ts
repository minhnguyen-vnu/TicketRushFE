import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { QueueStatus } from '../../../core/models/queue.model';
import { SeatService } from '../../seat-map/seat.service';
import { ToastService } from '../../../core/services/toast.service';
import { SeatMapComponent } from '../../seat-map/seat-map/seat-map.component';
import { QueueService } from '../queue.service';

@Component({
  selector: 'app-queue-room',
  imports: [SeatMapComponent],
  templateUrl: './queue-room.component.html',
})
export class QueueRoomComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queueService = inject(QueueService);
  private readonly seatService = inject(SeatService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly status = signal<QueueStatus | null>(null);
  readonly error = signal('');
  readonly accessCountdown = signal(0);
  readonly selectedCount = toSignal(
    this.seatService.selectedSeats$.pipe(map(seats => seats.length)),
    { initialValue: 0 },
  );

  readonly position = computed(() => this.status()?.position ?? 0);
  readonly totalUsers = computed(() => this.status()?.total_users ?? 0);
  readonly progressPercent = computed(() => {
    const total = this.totalUsers();
    const pos = this.position();
    if (total <= 0) return 0;
    const ahead = total - pos;
    return Math.min(100, Math.max(0, Math.round((ahead / total) * 100)));
  });

  protected eventId = '';
  private pollSub: Subscription | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.eventId = this.route.snapshot.queryParamMap.get('eventId') ?? '';
    if (!this.eventId) {
      this.error.set('Missing event id.');
      this.loading.set(false);
      return;
    }

    const cachedEventId = this.seatService.getCachedEventId();
    if (cachedEventId && cachedEventId !== this.eventId) {
      this.seatService.resetEventContext();
    }

    this.queueService.joinQueue(this.eventId).subscribe({
      next: result => {
        this.applyStatus(result);
        this.loading.set(false);
        if (!result.has_access) this.startPolling();
      },
      error: () => {
        this.error.set('Unable to join the queue. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = this.queueService.pollQueueStatus(this.eventId, 3000).subscribe({
      next: result => this.applyStatus(result),
      error: () => this.toast.error('Lost connection to the queue.'),
    });
  }

  private applyStatus(result: QueueStatus): void {
    this.status.set(result);
    if (result.has_access) {
      this.pollSub?.unsubscribe();
      this.pollSub = null;
      if (result.access_expires_in != null) {
        this.startCountdown(result.access_expires_in);
      }
      this.toast.success('Access granted!');
    }
  }

  protected onCheckout(): void {
    void this.router.navigate(['/checkout']);
  }

  private startCountdown(seconds: number): void {
    this.accessCountdown.set(seconds);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      const next = this.accessCountdown() - 1;
      this.accessCountdown.set(Math.max(0, next));
      if (next <= 0 && this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }, 1000);
  }

  formatCountdown(): string {
    const s = this.accessCountdown();
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
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }
}
