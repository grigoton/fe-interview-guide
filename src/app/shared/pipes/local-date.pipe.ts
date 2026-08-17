import { Pipe, PipeTransform } from '@angular/core';
import { LocaleId } from '../../core/services/locale.service';

/**
 * Formats an ISO timestamp for display.
 *
 * Angular's own `DatePipe` needs `registerLocaleData` for anything but `en-US`,
 * so this leans on `Intl` instead. The locale is passed in as an argument
 * (rather than injected) to keep the pipe pure: the value re-renders when the
 * caller's locale signal changes.
 */
@Pipe({ name: 'localDate', standalone: true })
export class LocalDatePipe implements PipeTransform {
  transform(value: string | null | undefined, locale: LocaleId = 'ru', withTime = false): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date);
  }
}
