import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div [class]="fullPage() ? 'fixed inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-50' : 'flex items-center justify-center p-8'">
      <div class="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  readonly fullPage = input(false);
}
