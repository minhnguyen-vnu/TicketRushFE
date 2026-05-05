import { Pipe, PipeTransform } from '@angular/core';

/**
 * Resize/optimise remote images on the fly.
 *
 * Unsplash + imgix accept `w`, `q`, `fm` query params. picsum.photos uses
 * `/<w>/<h>` path segments (already sized at the call site, so we pass through).
 * Any other host is returned unchanged.
 *
 * Usage:
 *   <img [src]="event.banner_url | imgThumb:600" />
 *   <img [src]="event.bannerUrl | imgThumb:1600:85" />
 */
@Pipe({ name: 'imgThumb' })
export class ImgThumbPipe implements PipeTransform {
  transform(url: string | null | undefined, width = 600, quality = 80): string {
    if (!url) return '';
    if (!/images\.unsplash\.com|imgix\.net/.test(url)) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}w=${width}&q=${quality}&fm=webp&auto=format`;
  }
}
