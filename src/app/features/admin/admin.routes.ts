import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-overview/admin-overview.component').then(m => m.AdminOverviewComponent),
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./event-management/admin-event-list/admin-event-list.component').then(
        m => m.AdminEventListComponent,
      ),
  },
  {
    path: 'events/new',
    loadComponent: () =>
      import('./event-management/event-form/event-form.component').then(m => m.EventFormComponent),
  },
  {
    path: 'events/:id/edit',
    loadComponent: () =>
      import('./event-management/event-form/event-form.component').then(m => m.EventFormComponent),
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'events/:id/demographics',
    loadComponent: () =>
      import('./demographics/demographics.component').then(m => m.DemographicsComponent),
  },
];
