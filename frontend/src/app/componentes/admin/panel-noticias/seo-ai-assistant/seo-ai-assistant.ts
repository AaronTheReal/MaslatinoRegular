import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  SEO_AI_FIELD_LABELS,
  SeoAiAnalyzeResponse,
  SeoAiApplySuggestionEvent,
  SeoAiDraft,
  SeoAiField,
  SeoAiMode,
  SeoAiStatusResponse,
  SeoAiSuggestion,
  SeoAiSuggestionValue,
} from '../../../../../models/seo-ai.model';
import {
  SeoAiAuthenticationError,
  SeoAiService,
} from '../../../../services/seo-ai-service';

@Component({
  selector: 'app-seo-ai-assistant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seo-ai-assistant.html',
  styleUrl: './seo-ai-assistant.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoAiAssistantComponent implements OnInit {
  @Input() draft: SeoAiDraft | null = null;
  @Input() noticiaId?: string;

  @Output() readonly applySuggestion =
    new EventEmitter<SeoAiApplySuggestionEvent>();

  readonly status = signal<SeoAiStatusResponse | null>(null);
  readonly result = signal<SeoAiAnalyzeResponse | null>(null);
  readonly loadingStatus = signal(false);
  readonly analyzing = signal(false);
  readonly statusError = signal('');
  readonly analysisError = signal('');

  private readonly seoAiService = inject(SeoAiService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.refreshStatus();
  }

  refreshStatus(): void {
    this.statusError.set('');

    if (!this.seoAiService.hasAdminSession()) {
      this.status.set(null);
      this.statusError.set(
        'Inicia sesión nuevamente en el panel para consultar el asistente.',
      );
      return;
    }

    this.loadingStatus.set(true);
    this.seoAiService
      .getStatus()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingStatus.set(false)),
      )
      .subscribe({
        next: (status) => this.status.set(status),
        error: (error: unknown) => {
          this.status.set(null);
          this.statusError.set(
            this.readError(
              error,
              'No se pudo consultar la configuración del asistente.',
            ),
          );
        },
      });
  }

  analyze(): void {
    if (!this.canAnalyze() || !this.draft) {
      return;
    }

    this.analysisError.set('');
    this.result.set(null);
    this.analyzing.set(true);

    this.seoAiService
      .analyze({
        draft: this.draft,
        ...(this.noticiaId ? { noticiaId: this.noticiaId } : {}),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.analyzing.set(false)),
      )
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error: unknown) => {
          this.analysisError.set(
            this.readError(error, 'No se pudo completar el análisis SEO.'),
          );
        },
      });
  }

  canAnalyze(): boolean {
    const status = this.status();
    return Boolean(
      this.draft &&
        status?.configured &&
        status.mode !== 'disabled' &&
        !this.analyzing(),
    );
  }

  emitSuggestion(suggestion: SeoAiSuggestion): void {
    this.applySuggestion.emit({
      field: suggestion.field,
      value: Array.isArray(suggestion.suggestedValue)
        ? [...suggestion.suggestedValue]
        : suggestion.suggestedValue,
    });
  }

  fieldLabel(field: SeoAiField): string {
    return SEO_AI_FIELD_LABELS[field];
  }

  modeLabel(mode: SeoAiMode): string {
    switch (mode) {
      case 'live':
        return 'IA activa';
      case 'mock':
        return 'Simulación (mock)';
      case 'disabled':
        return 'Deshabilitado';
    }
  }

  modeClass(mode: SeoAiMode): string {
    switch (mode) {
      case 'live':
        return 'text-bg-success';
      case 'mock':
        return 'text-bg-warning';
      case 'disabled':
        return 'text-bg-secondary';
    }
  }

  displayValue(value: SeoAiSuggestionValue): string {
    return Array.isArray(value) ? value.join(', ') : value;
  }

  scorePercent(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  scoreDelta(result: SeoAiAnalyzeResponse): number {
    return Math.round(result.scores.after - result.scores.before);
  }

  formatLatency(milliseconds: number | undefined): string {
    if (!milliseconds || milliseconds <= 0) {
      return '—';
    }
    return milliseconds < 1000
      ? `${Math.round(milliseconds)} ms`
      : `${(milliseconds / 1000).toFixed(1)} s`;
  }

  formatCost(usd: number): string {
    if (!usd) {
      return 'US$ 0';
    }
    // Los análisis individuales cuestan céntimos: cuatro decimales evitan que
    // todo se muestre como cero mientras el gasto crece.
    return `US$ ${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(2)}`;
  }

  totalTokens(result: SeoAiAnalyzeResponse): number {
    const usage = result.usage;
    if (!usage) {
      return 0;
    }
    return (
      usage.inputTokens +
      usage.outputTokens +
      usage.cacheReadTokens +
      usage.cacheCreationTokens
    );
  }

  trackSuggestion(
    _index: number,
    suggestion: SeoAiSuggestion,
  ): SeoAiField {
    return suggestion.field;
  }

  private readError(error: unknown, fallback: string): string {
    if (error instanceof SeoAiAuthenticationError) {
      return 'Tu sesión de administrador no está disponible. Inicia sesión nuevamente.';
    }

    if (error instanceof HttpErrorResponse) {
      const backendMessage = this.backendMessage(error.error);
      if (backendMessage) {
        return backendMessage;
      }
      if (error.status === 401 || error.status === 403) {
        return 'Tu sesión no tiene acceso al asistente SEO. Inicia sesión nuevamente.';
      }
      if (error.status === 429) {
        return 'Se alcanzó el límite temporal de análisis. Intenta de nuevo más tarde.';
      }
      if (error.status === 0) {
        return 'No fue posible conectar con el servicio SEO.';
      }
    }

    return error instanceof Error && error.message
      ? error.message
      : fallback;
  }

  private backendMessage(body: unknown): string {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return '';
    }

    const record = body as Record<string, unknown>;
    const directMessage = record['message'];
    if (typeof directMessage === 'string') {
      return directMessage.trim();
    }

    const nestedError = record['error'];
    if (typeof nestedError === 'object' && nestedError !== null && !Array.isArray(nestedError)) {
      const nestedMessage = (nestedError as Record<string, unknown>)['message'];
      return typeof nestedMessage === 'string' ? nestedMessage.trim() : '';
    }

    return '';
  }
}
