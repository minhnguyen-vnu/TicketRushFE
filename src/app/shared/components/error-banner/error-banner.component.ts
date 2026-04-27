import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-error-banner',
  template: `
    @if (visible()) {
      <div class="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
        <span class="flex-1">{{ message() }}</span>
        <button (click)="visible.set(false)" class="text-red-400 hover:text-red-600 leading-none text-lg">&times;</button>
      </div>
    }
  `,
})
export class ErrorBannerComponent {
  readonly message = input.required<string>();
  readonly visible = signal(true);
}
