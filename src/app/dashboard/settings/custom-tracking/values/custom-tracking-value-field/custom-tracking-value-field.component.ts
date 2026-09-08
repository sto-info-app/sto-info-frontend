import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  CustomTrackingConfiguration,
  CustomTrackingField,
  CustomTrackingFieldType,
  CustomTrackingOption,
  CustomTrackingPaletteColour,
  CustomTrackingTriState,
} from 'src/app/models/custom-tracking.models';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';
// Reused rather than restated. The question "which Markdown is this?" is the
// same question here as in a Storytime editor, and a second answer to it would
// be a second list of what the renderer supports, free to drift from the one
// the renderer actually implements.
import { MarkdownHintComponent } from 'src/app/storytime/shared/markdown-hint/markdown-hint.component';

import { timezoneChoices } from '../../definitions/custom-tracking-field-settings.utility';
import { CustomTrackingValueGroup } from '../custom-tracking-value-form.factory';
import {
  CUSTOM_TRACKING_COLOUR_MODES,
  CustomTrackingControlValue,
} from '../custom-tracking-value.utility';

/** One part of a duration, and whether the field asks for it. */
interface CustomTrackingDurationPart {
  /** The control holding it. */
  key: string;
  /** What it is called. */
  label: string;
}

/** Every part of a duration, in the order they are asked for. */
const DURATION_PARTS: readonly CustomTrackingDurationPart[] = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
];

/** The three answers a yes/no/unknown field offers, in order. */
const TRI_STATE_CHOICES: readonly { value: string; label: string }[] = [
  { value: CustomTrackingTriState.YES, label: 'Yes' },
  { value: CustomTrackingTriState.NO, label: 'No' },
  { value: CustomTrackingTriState.UNKNOWN, label: 'Unknown' },
];

/** What each validation failure is called where a reader can see it. */
const ERROR_SENTENCES: Record<string, string> = {
  required: 'This needs an answer.',
  wholeNumber: 'This has to be a whole number.',
  exactDecimal: 'Write this as a plain number, such as 12.5.',
  endsBeforeItStarts: 'This cannot end before it starts.',
  progressIncomplete: 'Give both how far along you are and the total.',
  totalOfNothing: 'The total has to be greater than zero.',
  pastTheEnd: 'This cannot be further along than the total.',
  pattern: 'This is not in the format the field asks for.',
};

/**
 * One field of a record, drawn as whatever it asks for.
 *
 * The control comes from the field's type and the bounds from its stored
 * configuration, so a field configured to accept two decimal places offers a
 * box that says so rather than one that looks like every other. Nothing here
 * decides what is acceptable: the server checks every answer again against the
 * field it actually belongs to, and this exists so somebody is told while they
 * are still looking at the box.
 *
 * Every state a control reports is also a word. A colour is shown with its
 * name beside the swatch, a switch says what it is set to, and a field that
 * has been answered `false` is visibly different from one nobody has answered.
 */
@Component({
  selector: 'app-custom-tracking-value-field',
  templateUrl: './custom-tracking-value-field.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    LcarsToggleComponent,
    MarkdownHintComponent,
    MarkdownPipe,
  ],
})
export class CustomTrackingValueFieldComponent {
  /** The field being answered. */
  @Input({ required: true }) field!: CustomTrackingField;

  /**
   * The controls answering it.
   *
   * Set rather than assigned, because the record is rebuilt whole every time
   * it is loaded or saved and this component is not: the fields are drawn by
   * their own identifiers, so the same instance is handed a new set of
   * controls. Anything watching the old ones would go on watching controls
   * nothing is bound to.
   */
  @Input({ required: true })
  set group(group: CustomTrackingValueGroup) {
    this._group = group;
    this.watchAnswered();
  }

  get group(): CustomTrackingValueGroup {
    return this._group;
  }

  /** Everything the server published about the feature. */
  @Input({ required: true }) configuration!: CustomTrackingConfiguration;

  /** The field types, for the template to switch on. */
  readonly fieldType = CustomTrackingFieldType;

  /** How a colour is being chosen. */
  readonly colourModes = CUSTOM_TRACKING_COLOUR_MODES;

  /** The three answers a yes/no/unknown field offers. */
  readonly triStateChoices = TRI_STATE_CHOICES;

  /** Every timezone that may be chosen. */
  readonly timezones = timezoneChoices();

  /** Whether the Markdown preview is showing. */
  isPreviewing = false;

  private _group!: CustomTrackingValueGroup;

  /** What is watching the switch of the controls in hand, if anything. */
  private _answering: Subscription | null = null;

  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Marks a yes-or-no field answered as soon as its switch is touched.
   *
   * The switch has two positions and the answer has three states, so what it
   * is set to and whether it has been set are held separately. Touching it is
   * what turns "nobody has said" into "they said no".
   *
   * Rebound whenever the controls are replaced. Without that, a switch nobody
   * had yet answered would go on reading as unanswered however many times it
   * was flipped after the first save — and an unanswered field is sent as a
   * cleared one, so the flip would be dropped rather than stored.
   */
  private watchAnswered(): void {
    this._answering?.unsubscribe();
    this._answering = null;

    const answered = this._group.get('answered');
    const boolean = this._group.get('boolean');

    if (!answered || !boolean) {
      return;
    }

    this._answering = boolean.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => answered.setValue(true));
  }

  /**
   * The identifier of one of this field's controls, for a label to point at.
   *
   * @param key - The control.
   * @returns An identifier unique to this field.
   */
  controlId(key: string): string {
    return `custom-tracking-value-${this.field.id}-${key}`;
  }

  /** @returns Where this field's validation message lives. */
  get errorId(): string {
    return `custom-tracking-value-${this.field.id}-error`;
  }

  /**
   * One of this field's controls.
   *
   * @param key - The control.
   * @returns The control.
   */
  control(key: string): FormControl {
    return this.group.get(key) as FormControl;
  }

  /**
   * What one control holds, as text.
   *
   * @param key - The control.
   * @returns Its contents.
   */
  held(key: string): string {
    return String(this.control(key).value);
  }

  /** @returns Whether this field has been answered at all. */
  get isAnswered(): boolean {
    return this.control('answered').value === true;
  }

  /** @returns What a yes-or-no field is currently set to. */
  get booleanAnswer(): boolean {
    return this.control('boolean').value === true;
  }

  /**
   * Whether one score on the scale is the one chosen.
   *
   * @param score - The score.
   * @returns True when it is.
   */
  isRating(score: number): boolean {
    return this.held('rating') === String(score);
  }

  /**
   * Chooses one score on the scale.
   *
   * @param score - The score, or null to leave the field unrated.
   */
  chooseRating(score: number | null): void {
    this.record('rating', score === null ? '' : String(score));
  }

  /**
   * Forgets a yes-or-no answer entirely.
   *
   * Not the same as answering no. A field nobody has answered is left out of
   * what is stored, and a reader is shown whatever the field says to show
   * where it is empty.
   */
  clearAnswer(): void {
    // Silently, because the switch's own listener treats any change to it as
    // somebody answering — and this is the opposite of answering.
    this.control('boolean').setValue(false, { emitEvent: false });
    this.record('answered', false);
  }

  /**
   * The options this field offers, withdrawn ones included where chosen.
   *
   * A withdrawn option stays listed for whoever already chose it, so their
   * answer goes on reading correctly and they can see what it was before
   * replacing it. It cannot be chosen afresh.
   *
   * @returns The options to draw.
   */
  get options(): CustomTrackingOption[] {
    return this.field.options.filter(
      option => !option.withdrawn || this.isChosen(option.id),
    );
  }

  /**
   * Whether one option is chosen.
   *
   * @param optionId - The option.
   * @returns True when it is.
   */
  isChosen(optionId: string): boolean {
    return this.chosen.includes(optionId);
  }

  /** @returns The options chosen, in the order they were chosen. */
  get chosen(): string[] {
    return this.control('optionIds').value as string[];
  }

  /**
   * Chooses one option, or lets go of it.
   *
   * @param optionId - The option.
   */
  toggleOption(optionId: string): void {
    const chosen = this.chosen;

    this.record(
      'optionIds',
      chosen.includes(optionId)
        ? chosen.filter(held => held !== optionId)
        : [...chosen, optionId],
    );
  }

  /**
   * Chooses one option instead of whatever was chosen before.
   *
   * @param optionId - The option, or an empty string for no answer.
   */
  chooseOnly(optionId: string): void {
    this.record('optionIds', optionId === '' ? [] : [optionId]);
  }

  /**
   * Puts something into a control on somebody's behalf.
   *
   * The controls a value accessor cannot reach — a row of radio buttons, a row
   * of chips — are set from here, and setting a control in code does not mark
   * it dirty by itself. Without that, a page could be told there was nothing
   * unsaved on it while holding a choice somebody had just made.
   *
   * @param key - The control.
   * @param value - What to put in it.
   */
  private record(key: string, value: CustomTrackingControlValue): void {
    this.control(key).setValue(value);
    this.group.markAsDirty();
  }

  /** @returns The scores this field's scale offers, smallest first. */
  get ratings(): number[] {
    const maximum = this.field.configuration['maximum'];
    const top = typeof maximum === 'number' ? maximum : 0;

    return Array.from({ length: top }, (_unused, index) => index + 1);
  }

  /** @returns The parts of a duration this field asks for. */
  get durationParts(): CustomTrackingDurationPart[] {
    return DURATION_PARTS.filter(part => {
      const asked =
        this.field.configuration[
          `include${part.key[0].toUpperCase()}${part.key.slice(1)}`
        ];

      return asked === true;
    });
  }

  /** @returns The colours this field offers by name. */
  get palette(): CustomTrackingPaletteColour[] {
    return this.configuration.palette;
  }

  /**
   * The custom property one palette colour is drawn through.
   *
   * A name rather than a colour. Drawing the swatch through the property is
   * what makes a value recorded against the LCARS sunflower stay the LCARS
   * sunflower if the palette is ever adjusted.
   *
   * @param token - The colour's name.
   * @returns A CSS value referring to it.
   */
  swatchFor(token: string): string {
    const colour = this.palette.find(entry => entry.token === token);

    return colour ? `var(${colour.cssVariable})` : 'transparent';
  }

  /**
   * What one palette colour is called.
   *
   * @param token - The colour's name.
   * @returns Its label, or the name itself where it is not one of ours.
   */
  labelFor(token: string): string {
    return this.palette.find(entry => entry.token === token)?.label ?? token;
  }

  /** @returns What the field asks for where nothing has been entered. */
  get placeholder(): string {
    const configured = this.field.configuration['placeholder'];

    return typeof configured === 'string' ? configured : '';
  }

  /** @returns The most characters this field accepts, or null. */
  get maxLength(): number | null {
    const configured = this.field.configuration['maxLength'];

    if (typeof configured === 'number') {
      return configured;
    }

    return this.field.fieldType === CustomTrackingFieldType.MARKDOWN
      ? this.configuration.limits.MAX_MARKDOWN_VALUE_LENGTH
      : this.configuration.limits.MAX_TEXT_VALUE_LENGTH;
  }

  /**
   * A setting of this field, where a control needs it as an attribute.
   *
   * @param key - The setting.
   * @returns Its value, or null where the field does not carry it.
   */
  setting(key: string): string | number | null {
    const held = this.field.configuration[key];

    return typeof held === 'number' || typeof held === 'string' ? held : null;
  }

  /** Shows the Markdown as it will be read, or goes back to writing it. */
  togglePreview(): void {
    this.isPreviewing = !this.isPreviewing;
  }

  /** @returns Whether anything about this field is wrong. */
  get isInvalid(): boolean {
    return this.group.invalid && this.group.touched;
  }

  /**
   * What is wrong with this field, in a sentence.
   *
   * One message for the whole field rather than one per control. A date range
   * that ends before it starts is not a fault of either date, and pointing at
   * one of them would say something untrue about it.
   *
   * @returns The sentence, or an empty string when nothing is wrong.
   */
  get errorMessage(): string {
    if (!this.isInvalid) {
      return '';
    }

    const named = Object.keys(this.group.errors ?? {});

    for (const control of Object.values(this.group.controls)) {
      named.push(...Object.keys(control.errors ?? {}));
    }

    return this.describe(named);
  }

  /**
   * Turns the failures a field reported into something a reader can act on.
   *
   * @param named - The failures, as the form named them.
   * @returns A sentence.
   */
  private describe(named: string[]): string {
    for (const failure of named) {
      const sentence = ERROR_SENTENCES[failure];

      if (sentence) {
        return sentence;
      }
    }

    if (named.includes('maxlength') || named.includes('minlength')) {
      return `This has to be ${this.lengthRequirement()}.`;
    }

    if (named.includes('precision')) {
      return `Keep this to ${this.setting('precision')} decimal places.`;
    }

    if (named.includes('tooFewChosen')) {
      return `Choose at least ${this.setting('minimumSelections')}.`;
    }

    if (named.includes('tooManyChosen')) {
      return `Choose no more than ${this.setting('maximumSelections')}.`;
    }

    return this.boundsRequirement();
  }

  /**
   * How long this field's answer has to be, in words.
   *
   * @returns The requirement.
   */
  private lengthRequirement(): string {
    const shortest = this.setting('minLength');
    const longest = this.maxLength;

    return shortest === null
      ? `${longest} characters or fewer`
      : `between ${shortest} and ${longest} characters`;
  }

  /**
   * What numbers this field accepts, in words.
   *
   * @returns The requirement, or a general apology where it has none.
   */
  private boundsRequirement(): string {
    const smallest = this.setting('minimum') ?? this.setting('minimumYear');
    const largest = this.setting('maximum') ?? this.setting('maximumYear');

    if (smallest === null && largest === null) {
      return 'This is not something the field accepts.';
    }

    if (smallest === null) {
      return `This has to be ${largest} or less.`;
    }

    return largest === null
      ? `This has to be ${smallest} or more.`
      : `This has to be between ${smallest} and ${largest}.`;
  }
}
