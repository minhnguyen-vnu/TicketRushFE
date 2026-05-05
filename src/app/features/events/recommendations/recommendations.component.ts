import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { EventListItem } from '../../../core/models/event.model';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { CurrencyVndPipe } from '../../../shared/pipes/currency-vnd.pipe';
import { ImgThumbPipe } from '../../../shared/pipes/img-thumb.pipe';
import { EventService } from '../event.service';
import { RecommendationItem, RecommendationService } from '../recommendation.service';

interface RecommendedCard {
  rec: RecommendationItem;
  event: EventListItem | null;
}

@Component({
  selector: 'app-recommendations',
  imports: [RouterLink, ErrorBannerComponent, CurrencyVndPipe, ImgThumbPipe],
  templateUrl: './recommendations.component.html',
})
export class RecommendationsComponent {
  private readonly recService = inject(RecommendationService);
  private readonly eventService = inject(EventService);
  private readonly destroyRef = inject(DestroyRef);

  readonly recs = signal<RecommendationItem[]>([]);
  readonly events = signal<EventListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  readonly cards = computed<RecommendedCard[]>(() => {
    const evMap = new Map(this.events().map(e => [e.id, e]));
    return this.recs().map(rec => ({ rec, event: evMap.get(rec.event_id) ?? null }));
  });

  constructor() {
    this.recService
      .getMyRecommendations()
      .pipe(
        switchMap(recs => {
          this.recs.set(recs);
          if (!recs.length) return of([] as EventListItem[]);
          return this.eventService.getEvents().pipe(catchError(() => of([] as EventListItem[])));
        }),
        catchError(() => {
          this.error.set('Failed to load recommendations. Please try again.');
          return of([] as EventListItem[]);
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

  protected scoreLabel(score: number): string {
    return score.toFixed(1);
  }
}
