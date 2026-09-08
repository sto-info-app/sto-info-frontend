import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  ControlContainer,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  SettingHelpComponent,
  SettingOption,
} from '../setting-help/setting-help.component';

/**
 * One of the settings on a Story, an Arc or a Chapter.
 *
 * Every such setting is a chooser with an explanation beside it, and they are
 * built the same way so that a creator learns the shape once. The control
 * itself stays in the editor's own form: this reaches into the form the field
 * sits in rather than holding a value of its own, so an editor still sees one
 * form with every setting on it.
 */
@Component({
  selector: 'app-storytime-setting-select',
  templateUrl: './setting-select.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SettingHelpComponent],
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective },
  ],
})
export class SettingSelectComponent {
  /** The identifier tying the label to the chooser. */
  @Input({ required: true }) fieldId!: string;

  /** What the setting is called. */
  @Input({ required: true }) label!: string;

  /** The control on the editor's form this setting sets. */
  @Input({ required: true }) controlName!: string;

  /** The LCARS colour the chooser is dressed in. */
  @Input({ required: true }) colour!: string;

  /** The choices, with their explanations where they have one. */
  @Input({ required: true }) options: readonly SettingOption[] = [];
}
