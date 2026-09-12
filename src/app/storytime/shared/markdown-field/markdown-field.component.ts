import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  ControlContainer,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { nextTabIndex } from 'src/app/shared/a11y/roving-tabs.utility';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ContentPreviewService } from '../../content-preview.service';
import { MarkdownHintComponent } from '../markdown-hint/markdown-hint.component';

/** Which half of the field is on screen. */
export type MarkdownFieldTab = 'edit' | 'preview';

/**
 * How long a render may take before it is called a failure.
 *
 * Rendering is a pass of regular expressions over at most a hundred thousand
 * characters, so a server that is answering at all answers well inside this.
 * The number is not there to bound the work; it is there so that a request
 * which will never be answered — a backend restarted mid-flight, a token
 * refresh that stalls behind it — ends in a message the writer can act on
 * rather than a spinner that never stops.
 */
export const PREVIEW_TIMEOUT_MS = 15_000;

/** One finished attempt at rendering, however it turned out. */
interface PreviewResult {
  /** The source it was rendered from, or null when the field was emptied. */
  source: string | null;

  /** The rendered HTML, or null when there is none to show. */
  html: string | null;

  /** Whether the attempt failed. */
  failed: boolean;
}

/**
 * A field that takes Storytime Markdown, with the reader's view beside it.
 *
 * Four fields across four editors accept the same Markdown — a Chapter body, a
 * Story or Arc description, a Character biography — and none of them could show
 * an author what they were writing. Markdown that cannot be seen rendered is
 * Markdown written by guesswork: the reference under the field says what the
 * syntax means, but only a preview says whether this particular paragraph came
 * out as one.
 *
 * Edit and Preview are tabs rather than two panes side by side. A Chapter is
 * written at a comfortable measure and read at one; halving the width to show
 * both would make the writing worse to do and the preview a poor likeness of
 * the page it is previewing.
 *
 * The preview is rendered by the server, not here. See
 * {@link ContentPreviewService} for why that is worth a round trip.
 *
 * The textarea is hidden rather than removed when Preview is showing, so
 * flipping back leaves the caret, the scroll position and the browser's own
 * undo history exactly as they were.
 */
@Component({
  selector: 'app-storytime-markdown-field',
  templateUrl: './markdown-field.component.html',
  styleUrls: ['./markdown-field.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LcarsErrorMessageComponent,
    MarkdownHintComponent,
  ],
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective },
  ],
})
export class MarkdownFieldComponent {
  /** The identifier tying the label to the textarea. */
  @Input({ required: true }) fieldId!: string;

  /** What the field is called. */
  @Input({ required: true }) label!: string;

  /** The control on the editor's form this field writes to. */
  @Input({ required: true }) controlName!: string;

  /** The LCARS colour the textarea is dressed in. */
  @Input({ required: true }) colour!: string;

  /**
   * The class the published page puts this writing in.
   *
   * Passed in rather than fixed, because the four fields are not presented
   * alike: a Chapter body is set at a reading measure, a Character biography
   * sits in a panel. Borrowing the reader's own class is what makes the preview
   * a likeness rather than an approximation of one.
   */
  @Input({ required: true }) previewClass!: string;

  /** How tall the textarea starts. */
  @Input() rows = 10;

  /** Which half of the field is showing. */
  activeTab: MarkdownFieldTab = 'edit';

  /** The rendered writing, or null when there is nothing rendered. */
  previewHtml: string | null = null;

  /** Whether a render is in flight. */
  isRendering = false;

  /** A message to show when the writing could not be rendered. */
  previewErrorMessage = '';

  /** The tabs, in strip order. */
  readonly tabs: readonly { id: MarkdownFieldTab; label: string }[] = [
    { id: 'edit', label: 'Edit' },
    { id: 'preview', label: 'Preview' },
  ];

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _previewService = inject(ContentPreviewService);
  private readonly _controlContainer = inject(ControlContainer);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * The source {@link previewHtml} was rendered from.
   *
   * What makes flipping between the tabs free. A render costs a request against
   * the general write allowance, so the answer is kept against the exact text
   * that produced it: returning to Preview having typed nothing asks again for
   * something already in hand, and typing a single character invalidates it.
   */
  private _renderedSource: string | null = null;

  /**
   * The source a request is currently out for.
   *
   * Distinct from {@link _renderedSource}, which is only set once an answer is
   * in hand. Asking again for the text already on the wire is the one case
   * worth skipping; asking for *different* text must always go, because the
   * answer coming back is about to be the wrong one.
   */
  private _inFlightSource: string | null = null;

  /** Every source asked for, in the order it was asked for. */
  private readonly _requests = new Subject<string | null>();

  /**
   * Creates an instance of MarkdownFieldComponent.
   *
   * The render stream is started here rather than in `ngOnInit` because it must
   * be listening before anything can ask it for a render, and a tab can be
   * pressed the moment the field is on screen.
   */
  constructor() {
    this.watchRequests();
  }

  /**
   * Whether there is writing to preview.
   *
   * @returns True when the field holds something other than whitespace.
   */
  get hasContent(): boolean {
    return this.source.trim().length > 0;
  }

  /**
   * The writing as it stands.
   *
   * @returns The control's value, or an empty string before it has one.
   */
  get source(): string {
    const value: unknown = this.control?.value;
    return typeof value === 'string' ? value : '';
  }

  /**
   * Shows one of the tabs, rendering the writing when Preview needs it.
   *
   * @param tab - The tab to show.
   */
  selectTab(tab: MarkdownFieldTab): void {
    this.activeTab = tab;

    if (tab === 'preview') {
      this.refreshPreview();
    }
  }

  /**
   * Renders the writing again after a failure.
   *
   * The tabs alone would do it — leaving Preview and coming back asks again —
   * but that is two presses and an unobvious pair of them, at the one moment
   * the field has already let somebody down.
   */
  retryPreview(): void {
    this._renderedSource = null;
    this._inFlightSource = null;
    this.refreshPreview();
  }

  /**
   * Moves between the tabs on an arrow key, as a tab list is expected to.
   *
   * @param event - The key that was pressed.
   */
  onTabKeydown(event: KeyboardEvent): void {
    const moved = nextTabIndex(
      event.key,
      this.tabs.findIndex(tab => tab.id === this.activeTab),
      this.tabs.length,
    );

    if (moved === null) {
      return;
    }

    event.preventDefault();

    this.selectTab(this.tabs[moved].id);
    this.focusTab(moved);
  }

  /**
   * The identifier of one of the tabs.
   *
   * Built from the field's own identifier, so two of these on a page — a Story
   * and its Chapter both being edited — never claim the same one.
   *
   * @param tab - Which tab.
   * @returns The element identifier.
   */
  tabId(tab: MarkdownFieldTab): string {
    return `${this.fieldId}-${tab}-tab`;
  }

  /**
   * The identifier of one of the panels.
   *
   * @param tab - Which panel.
   * @returns The element identifier.
   */
  panelId(tab: MarkdownFieldTab): string {
    return `${this.fieldId}-${tab}-panel`;
  }

  /**
   * Puts the keyboard on one of the tabs.
   *
   * @param index - Which tab, in the order the arrows move through them.
   */
  private focusTab(index: number): void {
    const tabs =
      this._host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]');

    tabs[index].focus();
  }

  /**
   * Asks for the writing to be rendered, unless the answer is already held.
   *
   * An empty field is answered here rather than by the server: there is nothing
   * to render, and asking would spend an allowance on an empty paragraph. It
   * still goes through the stream, so emptying the field while a request is out
   * for the old text calls that request off rather than letting its answer
   * arrive over the top.
   */
  private refreshPreview(): void {
    if (!this.hasContent) {
      this.previewErrorMessage = '';
      this._requests.next(null);
      return;
    }

    const source = this.source;

    // Already rendered, or already on the wire. Anything else has to go, even
    // with a request outstanding — see `_inFlightSource`.
    if (source === this._renderedSource || source === this._inFlightSource) {
      return;
    }

    this.isRendering = true;
    this.previewErrorMessage = '';
    this._inFlightSource = source;
    this._requests.next(source);
  }

  /**
   * Renders whatever has most recently been asked for.
   *
   * One long-lived stream rather than a subscription per click, so that
   * `switchMap` can do the two things a flag cannot. It abandons a request the
   * moment a newer one is made — the writer who edits a sentence and comes
   * straight back sees the sentence they just wrote, not the one before it —
   * and it leaves no way for an unanswered request to wedge the field, because
   * the next ask replaces it instead of being turned away at the door.
   *
   * Failures are folded into values rather than left as errors: an error would
   * end this stream for good, and the field would render nothing ever again.
   */
  private watchRequests(): void {
    this._requests
      .pipe(
        switchMap(source => this.attempt(source)),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(result => this.applyResult(result));
  }

  /**
   * One attempt at rendering a source.
   *
   * @param source - The source to render, or null for an emptied field.
   * @returns An observable of how the attempt turned out. Never errors.
   */
  private attempt(source: string | null): Observable<PreviewResult> {
    if (source === null) {
      return of({ source, html: null, failed: false });
    }

    return this._previewService.render(source).pipe(
      timeout(PREVIEW_TIMEOUT_MS),
      map(html => ({ source, html, failed: false })),
      catchError(() => of({ source, html: null, failed: true })),
    );
  }

  /**
   * Takes what an attempt came back with.
   *
   * @param result - The finished attempt.
   */
  private applyResult(result: PreviewResult): void {
    this.isRendering = false;
    this._inFlightSource = null;

    if (result.failed) {
      this.previewHtml = null;
      this._renderedSource = null;
      this.previewErrorMessage =
        'The preview could not be rendered. Nothing you have written is affected — try again in a moment.';
      return;
    }

    // Kept as a plain string rather than marked trusted, so Angular's own
    // sanitiser still runs over server-rendered HTML on its way into the page.
    // It costs the block anchors, which are invisible and which nothing in an
    // editor reads; the reader's page, which does read them, trusts the same
    // HTML deliberately.
    this.previewHtml = result.html;
    this._renderedSource = result.source;
    this.previewErrorMessage = '';
  }

  /**
   * The control this field writes to.
   *
   * @returns The control, or null when the form has not reached it yet.
   */
  private get control(): AbstractControl | null {
    return this._controlContainer.control?.get(this.controlName) ?? null;
  }
}
