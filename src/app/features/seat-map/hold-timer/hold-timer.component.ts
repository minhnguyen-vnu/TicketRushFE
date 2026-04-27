import { Component, DestroyRef, OnInit, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { SeatService } from '../seat.service';

@Component({
  selector: 'app-hold-timer',
  template: `
    @if (timeLeft() !== null) {
      <div
        [class]="timeLeft()! <= 60
          ? 'flex items-center gap-3 rounded-lg px-4 py-2.5 border text-sm mb-4 bg-red-950/50 border-red-800 text-red-300'
          : 'flex items-center gap-3 rounded-lg px-4 py-2.5 border text-sm mb-4 bg-zinc-800/60 border-zinc-700 text-zinc-300'"
      >
        <span class="flex-1">Hold expires in</span>
        <span
          [class]="timeLeft()! <= 60 ? 'font-mono font-bold text-red-400' : 'font-mono font-bold text-white'"
        >
          {{ formatTime(timeLeft()!) }}
        </span>
      </div>
    }
  `,
})
export class HoldTimerComponent implements OnInit {
  private readonly seatService = inject(SeatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly expired = output<void>();
  readonly timeLeft = signal<number | null>(null);

  ngOnInit(): void {
    this.seatService.selectedSeats$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncFromSeats());

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tick());

    this.syncFromSeats();
  }

  private syncFromSeats(): void {
    const locked = this.seatService.getSelectedSeats().filter(s => s.lockedUntil);
    if (!locked.length) {
      this.timeLeft.set(null);
      return;
    }
    const earliest = Math.min(...locked.map(s => new Date(s.lockedUntil!).getTime()));
    const secs = Math.max(0, Math.floor((earliest - Date.now()) / 1000));
    this.timeLeft.set(secs);
    if (secs === 0) this.expired.emit();
  }

  private tick(): void {
    const t = this.timeLeft();
    if (t === null) return;
    const next = t - 1;
    this.timeLeft.set(Math.max(0, next));
    if (next <= 0) this.expired.emit();
  }

  protected formatTime(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
