import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { take } from 'rxjs';

import {
  CustomTrackingAnswerSubmission,
  CustomTrackingConfiguration,
  CustomTrackingField,
  CustomTrackingFieldType,
  CustomTrackingImageAnswer,
  CustomTrackingRecord,
  CustomTrackingSectionTree,
  CustomTrackingStoredAnswer,
  CustomTrackingTabTree,
  CustomTrackingTarget,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { nextTabIndex } from 'src/app/shared/a11y/roving-tabs.utility';
import { ManagedActionRunner } from 'src/app/shared/actions/managed-action.runner';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { confirmDiscard } from 'src/app/shared/guards/unsaved-changes.guard';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

import { CustomTrackingService } from '../custom-tracking.service';
import { CustomTrackingSectionBarComponent } from '../custom-tracking-section-bar/custom-tracking-section-bar.component';
import { filterDefinitions } from '../definitions/custom-tracking-definition-filter.utility';
import { CustomTrackingImageValueComponent } from './custom-tracking-image-value/custom-tracking-image-value.component';
import {
  CustomTrackingValueGroup,
  buildValueGroup,
} from './custom-tracking-value-form.factory';
import { CustomTrackingValueFieldComponent } from './custom-tracking-value-field/custom-tracking-value-field.component';
import {
  CustomTrackingValueForm,
  isUnanswered,
  submissionFor,
} from './custom-tracking-value.utility';

/** Every field's controls, keyed by the field they answer. */
type CustomTrackingRecordForm = FormGroup<
  Record<string, CustomTrackingValueGroup>
>;

/**
 * The one record to fill in, where the host has already settled which.
 *
 * An account or captain page is about one record and nothing else, so the
 * chooser that belongs on the Settings page would be offering to wander off
 * the page somebody is looking at.
 */
export interface CustomTrackingFixedTarget {
  scope: CustomTrackingTargetScope;
  targetId: string;
}

/**
 * Recording values against one account or character.
 *
 * The record is chosen first and then filled in. A record is loaded whole —
 * the definitions applying to it travel with the answers already recorded —
 * so the form can never be drawn from one version of the hierarchy and filled
 * from another.
 *
 * It is saved whole, too. The rule that a required field must be answered is a
 * statement about the record rather than about one control: saving field by
 * field would let a record come to rest half-written, with some required
 * answers present and others missing, which is the state that rule exists to
 * prevent. The server writes it in one transaction, so a refusal anywhere
 * leaves everything exactly as it was rather than leaving somebody to work out
 * which of their changes survived.
 *
 * Pictures are the exception, and deliberately so. One arrives as bytes and is
 * checked as bytes before anything is stored, so it lands when it is uploaded
 * and the record save neither adds one nor takes one away.
 *
 * The same editor serves the Settings page and the account and captain pages.
 * Settings chooses which record to fill in, so it draws the two choosers;
 * a detail page is already about one record and hands that record in, so it
 * gets the same fields, the same required check and the same whole-record save
 * with nothing to choose. One editor rather than two is what stops "where do I
 * change this?" from having two answers that behave differently.
 */
@Component({
  selector: 'app-custom-tracking-values',
  templateUrl: './custom-tracking-values.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
    CustomTrackingSectionBarComponent,
    CustomTrackingValueFieldComponent,
    CustomTrackingImageValueComponent,
  ],
})
export class CustomTrackingValuesComponent implements OnInit {
  /** Everything the server published about the feature. */
  @Input({ required: true }) configuration!: CustomTrackingConfiguration;

  /**
   * The record to fill in, where the host has already settled which.
   *
   * Given by an account or captain page, which is about one record and nothing
   * else; left null by Settings, which offers the choice. Set, it replaces the
   * two choosers rather than pre-selecting them — a chooser that could be moved
   * off the record the surrounding page is showing would be offering to edit
   * something the reader is not looking at.
   */
  @Input() fixedTarget: CustomTrackingFixedTarget | null = null;

  /**
   * Whether this panel is the one on screen.
   *
   * A record is loaded whole, definitions and answers together, and that load
   * happens when the panel is created. The trouble is that the first thing
   * anybody does is build a section in the other panel and then come here to
   * fill it in — at which point a panel that had only ever loaded once says
   * they have defined nothing to record against. True when the page opened,
   * and the least useful moment to have remembered.
   *
   * So the record is fetched again whenever this panel comes to the front,
   * unless the form holds changes nobody has saved. Somebody who half-fills a
   * record, checks something in "What you track" and comes back should find
   * their work where they left it; a refresh that quietly threw it away would
   * be a worse fault than the one this fixes.
   */
  @Input()
  set active(isActive: boolean) {
    if (!isActive || !this._hasLoaded || this.hasUnsavedChanges()) {
      return;
    }

    this.refresh();
  }

  /** The two kinds of record, for the chooser. */
  readonly scopes = [
    {
      scope: CustomTrackingTargetScope.ACCOUNT,
      label: 'Accounts',
      hint: 'What you record about each STO account.',
    },
    {
      scope: CustomTrackingTargetScope.CHARACTER,
      label: 'Characters',
      hint: 'What you record about each character.',
    },
  ];

  /** Which kind of record is being filled in. */
  scope = CustomTrackingTargetScope.ACCOUNT;

  /** The records available to fill in. */
  targets: CustomTrackingTarget[] = [];

  /** The record being filled in, or null. */
  record: CustomTrackingRecord | null = null;

  /** The controls answering it, keyed by field. */
  form: CustomTrackingRecordForm = new FormGroup({});

  /** The picture stored against each image field, keyed by field. */
  images: Record<string, CustomTrackingImageAnswer | null> = {};

  /** Which tab of each section is showing, keyed by section. */
  activeTabs: Record<string, string> = {};

  /** The sections that are open, keyed by section. */
  openSections: Record<string, boolean> = {};

  /** Narrows the list of records by handle. */
  readonly targetSearch = new FormControl('', { nonNullable: true });

  /** Narrows the hierarchy to what matches. */
  readonly search = new FormControl('', { nonNullable: true });

  /**
   * Where the hierarchy is built.
   *
   * Only ever followed from a detail page. On Settings the builder is the
   * panel next door, and a link out to the page somebody is already on would
   * be the least helpful direction available.
   */
  readonly customTrackingLink = `/${APP_ROUTES.STO_DASHBOARD_CUSTOM_TRACKING}`;

  /** Whether the page is waiting on the server. */
  isLoading = true;

  /** What to tell the user when something failed. */
  errorMessage = '';

  /** What to tell the user when a save landed. */
  successMessage = '';

  /** The fields still needing an answer before the record may be saved. */
  missingRequired: string[] = [];

  /**
   * Every field of the open record, flattened.
   *
   * Held rather than walked for each time it is wanted. Saving, the required
   * check and the picture check all ask the same question of the same
   * hierarchy, and walking it three times would be three chances to walk it
   * differently.
   */
  private _fields: CustomTrackingField[] = [];

  /**
   * Whether the first load has happened.
   *
   * Angular sets inputs before it calls ngOnInit, so without this the panel
   * could be asked to fetch again before it had fetched at all.
   */
  private _hasLoaded = false;

  private readonly _customTracking = inject(CustomTrackingService);
  private readonly _dialog = inject(MatDialog);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroyRef = inject(DestroyRef);

  // No reload: a save answers with the record as it now stands, so asking for
  // it again would be a second request for something already in hand.
  private readonly _actions = new ManagedActionRunner(
    this,
    undefined,
    'That record could not be saved. Please try again shortly.',
  );

  /**
   * Opens the record handed in, or lists the ones that may be chosen from.
   */
  ngOnInit(): void {
    this._hasLoaded = true;

    if (this.fixedTarget) {
      this.scope = this.fixedTarget.scope;
      this.open(this.fixedTarget.targetId);
    } else {
      this.loadTargets();
    }

    this.search.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._cdr.markForCheck());

    this.targetSearch.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._cdr.markForCheck());
  }

  /**
   * Whether leaving now would lose something.
   *
   * Asked by the route guard, and by this component before it changes what it
   * is showing. A form somebody has half-filled is work.
   *
   * @returns True while the form holds changes nobody has saved.
   */
  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  /**
   * Warns before the browser itself throws unsaved work away.
   *
   * The route guard cannot see a closed tab or an address typed over the top
   * of this one, so the browser is asked to put up its own warning as well.
   * Cancelling the event is what asks for it; the wording is the browser's own
   * and cannot be set from here.
   *
   * @param event - The event to cancel, which is what shows the warning.
   */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  /** @returns What the records in this scope are called, in the plural. */
  get scopeNoun(): string {
    return this.scope === CustomTrackingTargetScope.ACCOUNT
      ? 'accounts'
      : 'characters';
  }

  /**
   * Saves the record when the form is submitted.
   *
   * The native event is cancelled rather than handled by a form group: each
   * field binds its own controls, and binding them to the element as well
   * would put two directives on the same group.
   *
   * @param event - The submission to cancel.
   */
  onSubmit(event: Event): void {
    event.preventDefault();
    this.save();
  }

  /** @returns Whether values may be changed at all just now. */
  get canEdit(): boolean {
    return this.configuration.features.valueEditingEnabled;
  }

  /** @returns The records to offer, narrowed by what was typed. */
  get shownTargets(): CustomTrackingTarget[] {
    const term = this.targetSearch.value.trim().toLowerCase();

    return term === ''
      ? this.targets
      : this.targets.filter(target =>
          target.label.toLowerCase().includes(term),
        );
  }

  /** @returns The record being filled in, or an empty string. */
  get targetId(): string {
    return this.record?.target.id ?? '';
  }

  /**
   * The hierarchy as it is being shown, narrowed by the search.
   *
   * A matching section or tab is kept whole, and a matching field keeps the
   * tab and section it lives in. Searching never changes what is stored or
   * what is sent — only what is on the screen.
   *
   * @returns The sections to draw.
   */
  get shownSections(): CustomTrackingSectionTree[] {
    if (!this.record) {
      return [];
    }

    return filterDefinitions(this.record.sections, this.search.value);
  }

  /**
   * Changes which kind of record is being filled in.
   *
   * @param scope - The kind to move to.
   */
  chooseScope(scope: CustomTrackingTargetScope): void {
    if (scope === this.scope) {
      return;
    }

    this.ifDiscardable(() => {
      this.scope = scope;
      this.record = null;
      this.form = new FormGroup({});
      this.loadTargets();
    });
  }

  /**
   * Changes which record is being filled in.
   *
   * @param targetId - The record to move to.
   */
  chooseTarget(targetId: string): void {
    if (targetId === this.targetId) {
      return;
    }

    this.ifDiscardable(() => {
      this.successMessage = '';
      this.open(targetId);
    });
  }

  /**
   * Opens or closes one section.
   *
   * @param sectionId - The section.
   */
  toggleSection(sectionId: string): void {
    this.openSections[sectionId] = !this.isOpen(sectionId);
  }

  /**
   * Whether one section is open.
   *
   * Sections start open. A required field hidden inside a closed section is a
   * save that fails for a reason nobody can see.
   *
   * @param sectionId - The section.
   * @returns True while it is open.
   */
  isOpen(sectionId: string): boolean {
    return this.openSections[sectionId] !== false;
  }

  /**
   * Shows one tab of a section.
   *
   * @param sectionId - The section.
   * @param tabId - The tab to show.
   */
  showTab(sectionId: string, tabId: string): void {
    this.activeTabs[sectionId] = tabId;
  }

  /**
   * Which tab of a section is showing.
   *
   * @param section - The section.
   * @returns The tab, or null where the section has none.
   */
  activeTab(section: CustomTrackingSectionTree): CustomTrackingTabTree | null {
    const chosen = section.tabs.find(
      tab => tab.id === this.activeTabs[section.id],
    );

    return chosen ?? section.tabs[0] ?? null;
  }

  /**
   * Moves between a section's tabs with the arrow keys.
   *
   * @param event - The key that was pressed.
   * @param section - The section whose tabs are being moved through.
   */
  onTabKeydown(event: KeyboardEvent, section: CustomTrackingSectionTree): void {
    const current = section.tabs.findIndex(
      tab => tab.id === this.activeTab(section)?.id,
    );
    const moved = nextTabIndex(event.key, current, section.tabs.length);

    if (moved === null) {
      return;
    }

    event.preventDefault();

    const tab = section.tabs[moved];

    this.showTab(section.id, tab.id);
    this.focusTab(tab.id);
  }

  /**
   * The controls answering one field.
   *
   * @param field - The field.
   * @returns Its controls.
   */
  groupFor(field: CustomTrackingField): CustomTrackingValueGroup {
    return this.form.controls[field.id];
  }

  /**
   * Whether a field takes a picture rather than an ordinary value.
   *
   * @param field - The field.
   * @returns True for an image field.
   */
  isImage(field: CustomTrackingField): boolean {
    return field.fieldType === CustomTrackingFieldType.IMAGE;
  }

  /**
   * The picture stored against one image field.
   *
   * @param field - The field.
   * @returns The picture, or null.
   */
  imageFor(field: CustomTrackingField): CustomTrackingImageAnswer | null {
    return this.images[field.id] ?? null;
  }

  /**
   * Records that a picture has been uploaded or removed.
   *
   * It landed on the server the moment it was uploaded, so this only keeps the
   * page in step — and re-checks what is still unanswered, since a picture may
   * have been what a required field was waiting for.
   *
   * @param field - The field answered.
   * @param image - The picture as the server now holds it, or null.
   */
  onImageChanged(
    field: CustomTrackingField,
    image: CustomTrackingImageAnswer | null,
  ): void {
    this.images[field.id] = image;
    this.missingRequired = this.unansweredRequired();
  }

  /**
   * Saves everything on the screen, once it is fit to send.
   *
   * The required check is made here as well as on the server, so somebody is
   * told which field is missing rather than having a save refused with a list
   * they then have to go and find.
   */
  save(): void {
    this.successMessage = '';
    this.form.markAllAsTouched();
    this.missingRequired = this.unansweredRequired();

    if (this.missingRequired.length > 0 || this.form.invalid) {
      this.errorMessage =
        this.missingRequired.length > 0
          ? `Answer every required field first: ${this.missingRequired.join(', ')}.`
          : 'Some answers cannot be saved as they stand. Check the fields marked below.';
      this._cdr.markForCheck();
      return;
    }

    this._actions.run(
      this._customTracking.saveRecord(
        this.scope,
        this.targetId,
        this.answers(),
      ),
      saved => {
        this.accept(saved);
        this.successMessage =
          'Saved. Everything on this record is as it is here.';
      },
    );
  }

  /** Throws away every unsaved change and reads what was stored again. */
  revert(): void {
    const open = this.record;

    if (!open) {
      return;
    }

    this.ifDiscardable(() => {
      this.successMessage = '';
      this.open(open.target.id);
    });
  }

  /**
   * What is sent for the record.
   *
   * Every field the form draws travels, whether or not it was touched: the
   * record is saved as it is shown, and a field left out of the payload would
   * simply keep whatever it held before. Image fields are the exception, since
   * a picture is never set through a value.
   *
   * @returns The answers to send.
   */
  private answers(): CustomTrackingAnswerSubmission[] {
    return this._fields
      .filter(field => !this.isImage(field))
      .map(field => ({
        fieldId: field.id,
        value: submissionFor(field, this.valueOf(field)),
      }));
  }

  /**
   * The required fields the record still has no answer for.
   *
   * @returns What each of them is called.
   */
  private unansweredRequired(): string[] {
    return this._fields
      .filter(
        field =>
          field.required &&
          isUnanswered(
            field,
            this.valueOf(field),
            this.imageFor(field) !== null,
          ),
      )
      .map(field => field.name);
  }

  /**
   * What one field's controls hold.
   *
   * @param field - The field.
   * @returns The control values.
   */
  private valueOf(field: CustomTrackingField): CustomTrackingValueForm {
    return this.form.controls[field.id].value as CustomTrackingValueForm;
  }

  /**
   * Fetches again what is already on screen.
   *
   * The record being filled in is reopened rather than the list reloaded from
   * the top, because reloading moves to the first record, and losing the
   * account somebody had chosen is its own small annoyance.
   */
  private refresh(): void {
    const open = this.targetId || this.fixedTarget?.targetId;

    if (open) {
      this.open(open);

      return;
    }

    this.loadTargets();
  }

  /** Reads the records this scope may be filled in against. */
  private loadTargets(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this._customTracking
      .getTargets(this.scope)
      .pipe(
        take(1),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: targets => {
          this.targets = targets;
          this.isLoading = false;

          if (targets.length > 0) {
            this.open(targets[0].id);
          }
        },
        error: () => {
          this.errorMessage = 'Unable to load your accounts and characters.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Loads one record and draws a form for it.
   *
   * @param targetId - The record to open.
   */
  private open(targetId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this._customTracking
      .getRecord(this.scope, targetId)
      .pipe(
        take(1),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: record => this.accept(record),
        error: () => {
          this.errorMessage = 'Unable to load that record.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Draws a form for a record the server has just described.
   *
   * @param record - The record.
   */
  private accept(record: CustomTrackingRecord): void {
    const answers = new Map<string, CustomTrackingStoredAnswer>(
      record.answers.map(answer => [answer.fieldId, answer] as const),
    );
    const controls: Record<string, CustomTrackingValueGroup> = {};

    this.images = {};
    this._fields = record.sections.flatMap(section =>
      section.tabs.flatMap(tab => tab.fields),
    );

    for (const field of this._fields) {
      const answer = answers.get(field.id);

      controls[field.id] = buildValueGroup(
        field,
        answer,
        this.configuration.limits,
      );
      this.images[field.id] = answer?.image ?? null;
    }

    this.record = record;
    this.form = new FormGroup(controls);
    this.missingRequired = [];
    this.isLoading = false;
    this.activeTabs = {};
  }

  /**
   * Runs something, asking first if it would throw unsaved work away.
   *
   * @param proceed - What to do once it is safe to.
   */
  private ifDiscardable(proceed: () => void): void {
    if (!this.hasUnsavedChanges()) {
      proceed();
      return;
    }

    confirmDiscard(this._dialog)
      .pipe(
        take(1),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(discard => {
        if (discard) {
          this.form.markAsPristine();
          proceed();
        }
      });
  }

  /**
   * Puts the keyboard on one tab.
   *
   * @param tabId - The tab.
   */
  private focusTab(tabId: string): void {
    const tab = this._host.nativeElement.querySelector<HTMLElement>(
      `#custom-tracking-value-tab-${tabId}`,
    );

    tab?.focus();
  }
}
