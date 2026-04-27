import { Component, computed, input, output } from '@angular/core';
import { Seat } from '../../../core/models/seat.model';

@Component({
  selector: 'app-seat-cell',
  template: `
    <button
      type="button"
      [class]="cellClass()"
      [disabled]="isDisabled()"
      [title]="tooltip()"
      (click)="handleClick()"
    ></button>
  `,
})
export class SeatCellComponent {
  readonly seat = input.required<Seat>();
  readonly currentUserId = input<string | null>(null);
  readonly zonePrice = input(0);

  readonly holdRequest = output<Seat>();
  readonly releaseRequest = output<Seat>();

  protected readonly isMyLocked = computed(
    () => this.seat().status === 'LOCKED' && this.seat().lockedBy === this.currentUserId(),
  );

  protected readonly isDisabled = computed(() => {
    const s = this.seat();
    return s.status === 'SOLD' || (s.status === 'LOCKED' && !this.isMyLocked());
  });

  private static readonly BASE =
    'w-7 h-7 rounded transition-colors duration-200 text-[9px] font-medium focus:outline-none focus:ring-1 focus:ring-white/30';

  protected readonly cellClass = computed(() => {
    const base = SeatCellComponent.BASE;
    const s = this.seat();
    if (s.status === 'SOLD') return `${base} bg-red-800 opacity-60 cursor-not-allowed`;
    if (s.status === 'LOCKED') {
      return this.isMyLocked()
        ? `${base} bg-violet-600 hover:bg-violet-500 cursor-pointer`
        : `${base} bg-zinc-600 opacity-50 cursor-not-allowed`;
    }
    return `${base} bg-green-700 hover:bg-green-600 cursor-pointer`;
  });

  protected readonly tooltip = computed(() => {
    const s = this.seat();
    const price = this.zonePrice().toLocaleString('vi-VN') + ' ₫';
    if (s.status === 'SOLD') return `${s.label} — Sold`;
    if (s.status === 'LOCKED') {
      return this.isMyLocked() ? `${s.label} — Your hold (click to release)` : `${s.label} — Held`;
    }
    return `${s.label} — ${price}`;
  });

  protected handleClick(): void {
    const s = this.seat();
    if (this.isMyLocked()) {
      this.releaseRequest.emit(s);
    } else if (s.status === 'AVAILABLE') {
      this.holdRequest.emit(s);
    }
  }
}
