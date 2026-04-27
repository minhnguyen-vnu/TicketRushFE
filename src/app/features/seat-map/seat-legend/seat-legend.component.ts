import { Component, input } from '@angular/core';
import { SeatMapZone } from '../../../core/models/seat-map.model';
import { CurrencyVndPipe } from '../../../shared/pipes/currency-vnd.pipe';

@Component({
  selector: 'app-seat-legend',
  imports: [CurrencyVndPipe],
  template: `
    <div class="space-y-3">
      <div class="flex flex-wrap gap-4 text-sm">
        @for (item of legend; track item.label) {
          <div class="flex items-center gap-1.5">
            <div [class]="item.color"></div>
            <span class="text-zinc-400">{{ item.label }}</span>
          </div>
        }
      </div>
      @if (zones().length) {
        <div class="flex flex-wrap gap-3">
          @for (zone of zones(); track zone.id) {
            <div class="flex items-center gap-1.5 text-xs text-zinc-400">
              <div class="w-3 h-3 rounded-sm" [style.background-color]="zone.color"></div>
              <span>{{ zone.name }}: {{ zone.price | currencyVnd }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SeatLegendComponent {
  readonly zones = input<SeatMapZone[]>([]);

  protected readonly legend = [
    { label: 'Available', color: 'w-4 h-4 rounded bg-green-700' },
    { label: 'Your selection', color: 'w-4 h-4 rounded bg-violet-600' },
    { label: 'Held by others', color: 'w-4 h-4 rounded bg-zinc-600' },
    { label: 'Sold', color: 'w-4 h-4 rounded bg-red-800' },
  ];
}
