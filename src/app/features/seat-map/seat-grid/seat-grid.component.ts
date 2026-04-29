import { Component, computed, input, output } from '@angular/core';
import { Seat } from '../../../core/models/seat.model';
import { SeatMapZone } from '../../../core/models/seat-map.model';
import { SeatCellComponent } from '../seat-cell/seat-cell.component';

@Component({
  selector: 'app-seat-grid',
  imports: [SeatCellComponent],
  template: `
    <div class="overflow-x-auto">
      @if (!isAssignedZone()) {
        <div class="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-center text-sm font-medium text-zinc-300">
          General admission · Capacity {{ zone().capacity }}
        </div>
      } @else {
      <div class="inline-block min-w-max">
        <!-- Column headers -->
        <div class="flex mb-1 pl-7">
          @for (col of colIndices(); track col) {
            <div class="w-8 text-center text-[10px] text-zinc-500 leading-none">{{ col + 1 }}</div>
          }
        </div>
        <!-- Rows -->
        @for (row of rowIndices(); track row) {
          <div class="flex items-center mb-1">
            <div class="w-7 text-[10px] text-zinc-500 text-right pr-1.5 leading-none shrink-0">{{ rowLabel(row) }}</div>
            @for (seat of seatsInRow(row); track seat.id) {
              <div class="mr-1">
                <app-seat-cell
                  [seat]="seat"
                  [currentUserId]="currentUserId()"
                  [zonePrice]="zone().price"
                  (holdRequest)="holdRequest.emit($event)"
                  (releaseRequest)="releaseRequest.emit($event)"
                />
              </div>
            }
          </div>
        }
      </div>
      }
    </div>
  `,
})
export class SeatGridComponent {
  readonly zone = input.required<SeatMapZone>();
  readonly currentUserId = input<string | null>(null);

  readonly holdRequest = output<Seat>();
  readonly releaseRequest = output<Seat>();

  protected readonly isAssignedZone = computed(() => this.zone().rows != null && this.zone().cols != null);

  protected readonly rowIndices = computed(() =>
    Array.from({ length: this.zone().rows ?? 0 }, (_, i) => i),
  );

  protected readonly colIndices = computed(() =>
    Array.from({ length: this.zone().cols ?? 0 }, (_, i) => i),
  );

  protected seatsInRow(rowIndex: number): Seat[] {
    return this.zone()
      .seats.filter(s => s.rowIndex === rowIndex)
      .sort((a, b) => a.colIndex - b.colIndex);
  }

  protected rowLabel(rowIndex: number): string {
    return String.fromCharCode(65 + rowIndex);
  }
}
