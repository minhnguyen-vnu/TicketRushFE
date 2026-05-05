import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';
import { EventListItem } from '../../../core/models/event.model';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { CurrencyVndPipe } from '../../../shared/pipes/currency-vnd.pipe';
import { ImgThumbPipe } from '../../../shared/pipes/img-thumb.pipe';
import { EventService } from '../event.service';

@Component({
  selector: 'app-event-list',
  imports: [ReactiveFormsModule, RouterLink, ErrorBannerComponent, CurrencyVndPipe, ImgThumbPipe],
  templateUrl: './event-list.component.html',
})
export class EventListComponent {
  private readonly eventService = inject(EventService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('');
  readonly dateFromControl = new FormControl('');
  readonly dateToControl = new FormControl('');

  readonly events = signal<EventListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  constructor() {
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith(''), debounceTime(400), distinctUntilChanged()),
      this.dateFromControl.valueChanges.pipe(startWith('')),
      this.dateToControl.valueChanges.pipe(startWith('')),
    ])
      .pipe(
        switchMap(([search, dateFrom, dateTo]) => {
          this.loading.set(true);
          this.error.set('');
          return this.eventService
            .getEvents({
              search: search || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            })
            .pipe(
              catchError(() => {
                this.error.set('Failed to load events. Please try again.');
                return of([] as EventListItem[]);
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(events => {
        this.events.set(events);
        this.loading.set(false);
      });
  }

  protected formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
