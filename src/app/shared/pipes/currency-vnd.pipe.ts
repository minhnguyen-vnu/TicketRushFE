import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyVnd' })
export class CurrencyVndPipe implements PipeTransform {
  transform(value: number): string {
    return value.toLocaleString('vi-VN') + ' ₫';
  }
}
