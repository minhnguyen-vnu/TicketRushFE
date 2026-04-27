import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/events/event-list/event-list.component').then(m => m.EventListComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./features/events/event-detail/event-detail.component').then(
        m => m.EventDetailComponent,
      ),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout/checkout.component').then(m => m.CheckoutComponent),
  },
  {
    path: 'checkout/success',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout-success/checkout-success.component').then(
        m => m.CheckoutSuccessComponent,
      ),
  },
  {
    path: 'my-tickets',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-tickets/my-tickets.component').then(m => m.MyTicketsComponent),
  },
  {
    path: 'queue',
    loadComponent: () =>
      import('./features/queue/queue-room/queue-room.component').then(m => m.QueueRoomComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
