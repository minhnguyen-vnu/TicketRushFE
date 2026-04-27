import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen text-center p-8">
      <h1 class="text-6xl font-bold text-gray-800">404</h1>
      <p class="mt-4 text-xl text-gray-500">Page not found</p>
      <a href="/" class="mt-6 text-indigo-600 hover:underline">Go home</a>
    </div>
  `,
})
export class NotFoundComponent {}
