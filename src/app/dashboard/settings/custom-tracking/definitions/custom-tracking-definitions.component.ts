import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Observable, take } from 'rxjs';

import {
  CustomTrackingConfiguration,
  CustomTrackingDeletionImpact,
  CustomTrackingField,
  CustomTrackingFieldType,
  CustomTrackingOption,
  CustomTrackingSectionTree,
  CustomTrackingTabTree,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { nextTabIndex } from 'src/app/shared/a11y/roving-tabs.utility';
import { ManagedActionRunner } from 'src/app/shared/actions/managed-action.runner';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

import {
  CustomTrackingFieldInput,
  CustomTrackingGroupInput,
  CustomTrackingService,
} from '../custom-tracking.service';
import {
  countFields,
  filterDefinitions,
} from './custom-tracking-definition-filter.utility';
import { deletionConfirmation } from './custom-tracking-deletion-message.utility';
import { CustomTrackingFieldFormComponent } from './custom-tracking-field-form/custom-tracking-field-form.component';
import { CustomTrackingFieldPanelComponent } from './custom-tracking-field-panel/custom-tracking-field-panel.component';
import { CustomTrackingGroupFormComponent } from './custom-tracking-group-form/custom-tracking-group-form.component';
import { CustomTrackingGroupPanelComponent } from './custom-tracking-group-panel/custom-tracking-group-panel.component';
import {
  CustomTrackingOptionDefault,
  CustomTrackingOptionRename,
  CustomTrackingOptionsEditorComponent,
} from './custom-tracking-options-editor/custom-tracking-options-editor.component';
import { CustomTrackingReorderControlsComponent } from './custom-tracking-reorder-controls/custom-tracking-reorder-controls.component';
import { moveInList } from './custom-tracking-reordering.utility';

/** Which form is open, and what it is editing. */
export interface CustomTrackingEditorState {
  /** What is being edited. */
  kind: 'section' | 'tab' | 'field';
  /**
   * The section a tab belongs to, or the tab a field belongs to.
   *
   * Empty for a section, which belongs to the scope rather than to anything
   * inside it.
   */
  parentId: string;
  /** What is being changed, or null when something is being created. */
  id: string | null;
}

/**
 * The builder: one scope of sections, tabs and fields, and everything that
 * changes them.
 *
 * The whole scope is loaded in one request rather than a branch at a time,
 * because the search box searches all of it. A search that could see only the
 * branches somebody had opened would quietly miss what it was asked for, and
 * the user would conclude the field was gone.
 *
 * Every change is sent and then the hierarchy is read again rather than
 * patched in place. The server decides what the result actually is — it
 * renumbers orders, refuses duplicate names and normalises configuration — and
 * a copy mended here would drift from it in exactly the cases that matter.
 *
 * Nothing is deleted without saying what would go with it. The counts are read
 * from the server first, because "delete this section" and "delete this
 * section, four tabs, nineteen fields and sixty-three recorded answers" are
 * different decisions and only one of them is the one being made.
 */
@Component({
  selector: 'app-custom-tracking-definitions',
  templateUrl: './custom-tracking-definitions.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    CustomTrackingGroupPanelComponent,
    CustomTrackingGroupFormComponent,
    CustomTrackingFieldPanelComponent,
    CustomTrackingFieldFormComponent,
    CustomTrackingOptionsEditorComponent,
    CustomTrackingReorderControlsComponent,
  ],
})
export class CustomTrackingDefinitionsComponent implements OnInit {
  /** Everything the server published about the feature. */
  @Input({ required: true }) configuration!: CustomTrackingConfiguration;

  /** The two hierarchies, for the chooser. */
  readonly scopes = [
    {
      scope: CustomTrackingTargetScope.ACCOUNT,
      label: 'Accounts',
      hint: 'Asked once of every STO account you have.',
    },
    {
      scope: CustomTrackingTargetScope.CHARACTER,
      label: 'Characters',
      hint: 'Asked once of every character you have.',
    },
  ];

  /** Which hierarchy is being built. */
  scope = CustomTrackingTargetScope.ACCOUNT;

  /** The hierarchy, as the server last confirmed it. */
  sections: CustomTrackingSectionTree[] = [];

  /** Whether the page is waiting on the server. */
  isLoading = true;

  /** What to tell the user when something failed. */
  errorMessage = '';

  /** Which form is open, or null. */
  editor: CustomTrackingEditorState | null = null;

  /** What is being looked for. */
  readonly search = new FormControl('', { nonNullable: true });

  /** Which tab of each section is showing, keyed by the section. */
  activeTabs: Record<string, string> = {};

  private readonly _collapsed = new Set<string>();
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _customTracking = inject(CustomTrackingService);
  private readonly _dialog = inject(MatDialog);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _actions = new ManagedActionRunner(this, () => this.load());

  /**
   * Reads the hierarchy for the scope being built.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * The parts of the hierarchy worth showing.
   *
   * @returns Everything, or what mentions the search term.
   */
  get visibleSections(): CustomTrackingSectionTree[] {
    return filterDefinitions(this.sections, this.search.value);
  }

  /**
   * The hierarchy being built, in words.
   *
   * A section belongs to one scope and cannot be moved to the other, so the
   * form that creates one says which it is about to create in.
   *
   * @returns "for your accounts" or "for your characters".
   */
  get scopeContext(): string {
    return this.scope === CustomTrackingTargetScope.ACCOUNT
      ? 'for your accounts'
      : 'for your characters';
  }

  /**
   * Whether a search is narrowing what is shown.
   *
   * @returns True when something is being looked for.
   */
  get isSearching(): boolean {
    return this.search.value.trim() !== '';
  }

  /**
   * How many fields the scope holds.
   *
   * @returns The count, across every tab of every section.
   */
  get fieldCount(): number {
    return countFields(this.sections);
  }

  /**
   * Whether another section may be created.
   *
   * @returns True while the scope is below its published ceiling.
   */
  get canAddSection(): boolean {
    return (
      this.sections.length < this.configuration.limits.MAX_SECTIONS_PER_SCOPE
    );
  }

  /**
   * Whether another field may be created anywhere in the scope.
   *
   * @returns True while the scope is below its published ceiling.
   */
  get isScopeFull(): boolean {
    return this.fieldCount >= this.configuration.limits.MAX_FIELDS_PER_SCOPE;
  }

  /**
   * The section whose form is open, or null.
   *
   * @returns The section being changed.
   */
  get editingSection(): CustomTrackingSectionTree | null {
    return this.editor?.kind === 'section'
      ? (this.sections.find(section => section.id === this.editor?.id) ?? null)
      : null;
  }

  /**
   * The tab whose form is open, or null.
   *
   * @returns The tab being changed.
   */
  get editingTab(): CustomTrackingTabTree | null {
    return this.editor?.kind === 'tab'
      ? (this.allTabs.find(tab => tab.id === this.editor?.id) ?? null)
      : null;
  }

  /**
   * The field whose form is open, or null.
   *
   * @returns The field being changed.
   */
  get editingField(): CustomTrackingField | null {
    return this.editor?.kind === 'field'
      ? (this.allFields.find(field => field.id === this.editor?.id) ?? null)
      : null;
  }

  /**
   * Whether the section a tab or field editor sits under is public.
   *
   * @returns True when nothing above the thing being edited is private.
   */
  get editorAncestorPublic(): boolean {
    if (this.editor?.kind === 'tab') {
      return (
        this.sections.find(section => section.id === this.editor?.parentId)
          ?.publiclyVisible ?? true
      );
    }

    const tab = this.allTabs.find(
      candidate => candidate.id === this.editor?.parentId,
    );
    const section = this.sections.find(
      candidate => candidate.id === tab?.sectionId,
    );

    return (tab?.publiclyVisible ?? true) && (section?.publiclyVisible ?? true);
  }

  /** Every tab in the scope, whichever section it belongs to. */
  get allTabs(): CustomTrackingTabTree[] {
    return this.sections.flatMap(section => section.tabs);
  }

  /** Every field in the scope, whichever tab it belongs to. */
  get allFields(): CustomTrackingField[] {
    return this.allTabs.flatMap(tab => tab.fields);
  }

  /**
   * Switches to the other hierarchy.
   *
   * @param scope - The hierarchy to build.
   */
  chooseScope(scope: CustomTrackingTargetScope): void {
    if (scope === this.scope) {
      return;
    }

    this.scope = scope;
    this.editor = null;
    this._collapsed.clear();
    this.activeTabs = {};
    this.load();
  }

  /**
   * Whether a section is showing what is inside it.
   *
   * Open unless it has been folded away, the same as every other section on
   * the site: somebody arriving at the builder came to see what they have
   * built, not to open ten panels before they can read any of it.
   *
   * A search opens everything it matched, whatever was folded away before it.
   * Leaving a match closed would report a hit and then hide it.
   *
   * @param id - The section.
   * @returns True when it is open.
   */
  isExpanded(id: string): boolean {
    return this.isSearching || !this._collapsed.has(id);
  }

  /**
   * Folds a section away, or opens it again.
   *
   * @param id - The section.
   */
  toggle(id: string): void {
    if (this._collapsed.has(id)) {
      this._collapsed.delete(id);
    } else {
      this._collapsed.add(id);
    }
  }

  /**
   * Which tab of a section is showing.
   *
   * The first one until somebody chooses another, and the first one again
   * whenever the chosen tab is not among those on the screen — a search
   * narrows a section to the tabs it matched, and a selection made before it
   * may no longer be one of them.
   *
   * @param section - The section, as it is being shown.
   * @returns The tab to draw, or null where the section has none.
   */
  activeTab(section: CustomTrackingSectionTree): CustomTrackingTabTree | null {
    const chosen = section.tabs.find(
      tab => tab.id === this.activeTabs[section.id],
    );

    return chosen ?? section.tabs[0] ?? null;
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
   * Moves between a section's tabs with the arrow keys.
   *
   * The same roving behaviour as every other tab strip on the site, taken from
   * the shared helper rather than written again.
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
   * The identifier of one of the strip's elements.
   *
   * @param part - Which element: the tab itself or the panel it controls.
   * @param tabId - The tab it belongs to.
   * @returns The identifier.
   */
  elementId(part: 'tab' | 'panel', tabId: string): string {
    return `custom-tracking-definition-${part}-${tabId}`;
  }

  /**
   * How many fields a tab holds, in words.
   *
   * @param tabId - The tab.
   * @returns A count and the right noun for it.
   */
  fieldSummary(tabId: string): string {
    const held = this.fieldCountIn(tabId);

    return held === 1 ? '1 field' : `${held} fields`;
  }

  /**
   * What a field type is called, as the server named it.
   *
   * @param fieldType - The type.
   * @returns Its label, or the stored identifier where none was published.
   */
  typeLabel(fieldType: CustomTrackingFieldType): string {
    return (
      this.configuration.fieldTypes.find(type => type.fieldType === fieldType)
        ?.label ?? fieldType
    );
  }

  /**
   * Whether a field draws its answers from a list of options.
   *
   * @param field - The field.
   * @returns True when the catalogue says its type uses options.
   */
  usesOptions(field: CustomTrackingField): boolean {
    return (
      this.configuration.fieldTypes.find(
        type => type.fieldType === field.fieldType,
      )?.usesOptions ?? false
    );
  }

  /**
   * Whether more than one option may be chosen at once.
   *
   * @param field - The field.
   * @returns True when the catalogue says so.
   */
  allowsMultipleOptions(field: CustomTrackingField): boolean {
    return (
      this.configuration.fieldTypes.find(
        type => type.fieldType === field.fieldType,
      )?.allowsMultipleOptions ?? false
    );
  }

  /**
   * What one of a field options is called, in prose.
   *
   * @param field - The field.
   * @returns "tag" for a tag field, otherwise "choice".
   */
  optionNoun(field: CustomTrackingField): string {
    return field.fieldType === CustomTrackingFieldType.TAGS ? 'tag' : 'choice';
  }

  /**
   * A section as the server sent it, rather than as a search narrowed it.
   *
   * Counting and reordering are always done against the whole hierarchy. A
   * search shows a subset, and moving the third of three visible tabs when the
   * section really holds nine would send an order that describes nothing.
   *
   * @param sectionId - The section.
   * @returns The section, or null when it is no longer there.
   */
  sourceSection(sectionId: string): CustomTrackingSectionTree | null {
    return this.sections.find(section => section.id === sectionId) ?? null;
  }

  /**
   * A tab as the server sent it, rather than as a search narrowed it.
   *
   * @param tabId - The tab.
   * @returns The tab, or null when it is no longer there.
   */
  sourceTab(tabId: string): CustomTrackingTabTree | null {
    return this.allTabs.find(tab => tab.id === tabId) ?? null;
  }

  /**
   * Where a section really sits, whatever a search is showing.
   *
   * @param sectionId - The section.
   * @returns Its position among all of them.
   */
  sectionPosition(sectionId: string): number {
    return this.sections.findIndex(section => section.id === sectionId);
  }

  /**
   * Where a tab really sits inside its section.
   *
   * @param tab - The tab.
   * @returns Its position among the section's tabs.
   */
  tabPosition(tab: CustomTrackingTabTree): number {
    return (
      this.sourceSection(tab.sectionId)?.tabs.findIndex(
        candidate => candidate.id === tab.id,
      ) ?? -1
    );
  }

  /**
   * Where a field really sits inside its tab.
   *
   * @param field - The field.
   * @returns Its position among the tab's fields.
   */
  fieldPosition(field: CustomTrackingField): number {
    return (
      this.sourceTab(field.tabId)?.fields.findIndex(
        candidate => candidate.id === field.id,
      ) ?? -1
    );
  }

  /**
   * How many tabs a section really holds.
   *
   * @param sectionId - The section.
   * @returns The count.
   */
  tabCount(sectionId: string): number {
    return this.sourceSection(sectionId)?.tabs.length ?? 0;
  }

  /**
   * How many fields a tab really holds.
   *
   * @param tabId - The tab.
   * @returns The count.
   */
  fieldCountIn(tabId: string): number {
    return this.sourceTab(tabId)?.fields.length ?? 0;
  }

  /**
   * Whether a tab may hold another field.
   *
   * @param tabId - The tab.
   * @returns True while both the tab and the scope are below their ceilings.
   */
  canAddField(tabId: string): boolean {
    return (
      !this.isScopeFull &&
      this.fieldCountIn(tabId) < this.configuration.limits.MAX_FIELDS_PER_TAB
    );
  }

  /**
   * Whether a section may hold another tab.
   *
   * @param sectionId - The section.
   * @returns True while it is below its published ceiling.
   */
  canAddTab(sectionId: string): boolean {
    return (
      this.tabCount(sectionId) < this.configuration.limits.MAX_TABS_PER_SECTION
    );
  }

  /** Opens an empty form for a new section. */
  addSection(): void {
    this.editor = { kind: 'section', parentId: '', id: null };
  }

  /**
   * Opens a section for changing.
   *
   * @param section - The section.
   */
  editSection(section: CustomTrackingSectionTree): void {
    this.reveal(section.id);
    this.editor = { kind: 'section', parentId: '', id: section.id };
  }

  /**
   * Opens an empty form for a new tab.
   *
   * @param section - The section it would belong to.
   */
  addTab(section: CustomTrackingSectionTree): void {
    this.editor = { kind: 'tab', parentId: section.id, id: null };
  }

  /**
   * Opens a tab for changing.
   *
   * @param tab - The tab.
   */
  editTab(tab: CustomTrackingTabTree): void {
    this.reveal(tab.sectionId, tab.id);
    this.editor = { kind: 'tab', parentId: tab.sectionId, id: tab.id };
  }

  /**
   * Opens an empty form for a new field.
   *
   * @param tab - The tab it would belong to.
   */
  addField(tab: CustomTrackingTabTree): void {
    this.editor = { kind: 'field', parentId: tab.id, id: null };
  }

  /**
   * Opens a field for changing.
   *
   * @param field - The field.
   */
  editField(sectionId: string, field: CustomTrackingField): void {
    this.reveal(sectionId, field.tabId);
    this.editor = { kind: 'field', parentId: field.tabId, id: field.id };
  }

  /**
   * Opens whatever has to be open for an editor to be seen.
   *
   * Edit and Delete sit on a section's bar, which is visible whether or not the
   * section is open, and on a tab's toolbar, which is only drawn for the tab
   * showing. The form they summon renders inside one of those. Without this,
   * pressing Edit on a folded section does nothing at all, and a button that
   * appears to do nothing is a button people press again.
   *
   * @param sectionId - The section to open.
   * @param tabId - The tab to bring to the front, where the editor is in one.
   */
  private reveal(sectionId: string, tabId?: string): void {
    this._collapsed.delete(sectionId);

    if (tabId) {
      this.showTab(sectionId, tabId);
    }
  }

  /**
   * Puts the keyboard on one of a section's tabs.
   *
   * @param tabId - The tab to focus.
   */
  private focusTab(tabId: string): void {
    this._host.nativeElement
      .querySelector<HTMLElement>(`#${this.elementId('tab', tabId)}`)
      ?.focus();
  }

  /** Closes whichever form is open. */
  closeEditor(): void {
    this.editor = null;
  }

  /**
   * Saves a section or a tab, whichever form is open.
   *
   * @param input - What the user asked for.
   */
  saveGroup(input: CustomTrackingGroupInput): void {
    const editor = this.editor;

    if (!editor) {
      return;
    }

    this._actions.run(this.groupAction(editor, input), () =>
      this.closeEditor(),
    );
  }

  /**
   * Saves a field.
   *
   * @param input - What the user asked for.
   */
  saveField(input: CustomTrackingFieldInput): void {
    const editor = this.editor;

    if (!editor) {
      return;
    }

    const action = editor.id
      ? this._customTracking.updateField(editor.id, input)
      : this._customTracking.createField(editor.parentId, input);

    this._actions.run(action, () => this.closeEditor());
  }

  /**
   * Deletes a section, once its owner has seen what would go with it.
   *
   * @param section - The section.
   */
  removeSection(section: CustomTrackingSectionTree): void {
    this.confirmThenDelete(
      this._customTracking.getSectionDeletionImpact(section.id),
      'section',
      section.name,
      () => this._customTracking.deleteSection(section.id),
    );
  }

  /**
   * Deletes a tab, once its owner has seen what would go with it.
   *
   * @param tab - The tab.
   */
  removeTab(tab: CustomTrackingTabTree): void {
    this.confirmThenDelete(
      this._customTracking.getTabDeletionImpact(tab.id),
      'tab',
      tab.name,
      () => this._customTracking.deleteTab(tab.id),
    );
  }

  /**
   * Deletes a field, once its owner has seen how many answers would go.
   *
   * @param field - The field.
   */
  removeField(field: CustomTrackingField): void {
    this.confirmThenDelete(
      this._customTracking.getFieldDeletionImpact(field.id),
      'field',
      field.name,
      () => this._customTracking.deleteField(field.id),
    );
  }

  /**
   * Moves a section and saves the whole new order.
   *
   * @param from - Where it is.
   * @param to - Where it is going.
   */
  reorderSections(from: number, to: number): void {
    const ordered = moveInList(this.sections, from, to);

    this._actions.run(
      this._customTracking.reorderSections(
        this.scope,
        ordered.map(section => section.id),
      ),
    );
  }

  /**
   * Moves a tab within its section and saves the whole new order.
   *
   * @param sectionId - The section it belongs to.
   * @param from - Where it is.
   * @param to - Where it is going.
   */
  reorderTabs(sectionId: string, from: number, to: number): void {
    const tabs = this.sourceSection(sectionId)?.tabs ?? [];
    const moved = tabs[from];
    const ordered = moveInList(tabs, from, to);

    // The tab being moved is the tab somebody is looking at, and it stays the
    // one they are looking at. Until a tab is chosen outright the strip shows
    // whichever is first, so moving that one along would otherwise leave a
    // different tab's fields on the screen — as though the arrow had swapped
    // the contents rather than the order.
    if (moved) {
      this.showTab(sectionId, moved.id);
    }

    this._actions.run(
      this._customTracking.reorderTabs(
        sectionId,
        ordered.map(tab => tab.id),
      ),
    );
  }

  /**
   * Moves a field within its tab and saves the whole new order.
   *
   * @param tabId - The tab it belongs to.
   * @param from - Where it is.
   * @param to - Where it is going.
   */
  reorderFields(tabId: string, from: number, to: number): void {
    const fields = this.sourceTab(tabId)?.fields ?? [];
    const ordered = moveInList(fields, from, to);

    this._actions.run(
      this._customTracking.reorderFields(
        tabId,
        ordered.map(field => field.id),
      ),
    );
  }

  /**
   * Adds an option to the field whose form is open.
   *
   * @param field - The field.
   * @param label - The wording of the option.
   */
  addOption(field: CustomTrackingField, label: string): void {
    this._actions.run(
      this._customTracking.createOption(field.id, { label, isDefault: false }),
    );
  }

  /**
   * Rewords an option.
   *
   * @param rename - Which option, and what it should say.
   */
  renameOption(rename: CustomTrackingOptionRename): void {
    this._actions.run(
      this._customTracking.updateOption(rename.optionId, {
        label: rename.label,
      }),
    );
  }

  /**
   * Turns an option default on or off.
   *
   * @param change - Which option, and whether it should be chosen to begin
   *   with.
   */
  setOptionDefault(change: CustomTrackingOptionDefault): void {
    this._actions.run(
      this._customTracking.updateOption(change.optionId, {
        isDefault: change.isDefault,
      }),
    );
  }

  /**
   * Withdraws an option.
   *
   * Never a hard deletion, so nothing is asked before it: a value that already
   * chose the option keeps reading correctly, and only new selections are
   * refused.
   *
   * @param option - The option to withdraw.
   */
  withdrawOption(option: CustomTrackingOption): void {
    this._actions.run(this._customTracking.deleteOption(option.id));
  }

  /**
   * Puts a field options into a new order.
   *
   * @param field - The field.
   * @param orderedIds - Every live option on it, in order.
   */
  reorderOptions(field: CustomTrackingField, orderedIds: string[]): void {
    this._actions.run(
      this._customTracking.reorderOptions(field.id, orderedIds),
    );
  }

  /**
   * Reads the hierarchy for the scope being built.
   */
  private load(): void {
    this.isLoading = true;

    this._customTracking
      .getDefinitions(this.scope)
      .pipe(
        take(1),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: sections => {
          this.sections = sections;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Unable to load your custom tracking setup.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Which request saves the section or tab being edited.
   *
   * @param editor - Which form is open.
   * @param input - What the user asked for.
   * @returns The request to send.
   */
  private groupAction(
    editor: CustomTrackingEditorState,
    input: CustomTrackingGroupInput,
  ): Observable<unknown> {
    if (editor.kind === 'section') {
      return editor.id
        ? this._customTracking.updateSection(editor.id, input)
        : this._customTracking.createSection(this.scope, input);
    }

    return editor.id
      ? this._customTracking.updateTab(editor.id, input)
      : this._customTracking.createTab(editor.parentId, input);
  }

  /**
   * Reads what a deletion would take, asks, and deletes if told to.
   *
   * @param impact - The request that counts what would go.
   * @param kind - What is being deleted, in prose.
   * @param name - What it is called.
   * @param remove - The request that deletes it.
   */
  private confirmThenDelete(
    impact: Observable<CustomTrackingDeletionImpact>,
    kind: string,
    name: string,
    remove: () => Observable<void>,
  ): void {
    this.isLoading = true;
    this.errorMessage = '';

    impact
      .pipe(
        take(1),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: counted => {
          this.isLoading = false;
          this.ask(deletionConfirmation(kind, name, counted), () =>
            this._actions.run(remove(), () => this.closeEditor()),
          );
        },
        error: () => {
          this.errorMessage =
            'Unable to work out what deleting that would remove, so nothing has been deleted.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Puts a question to the user and acts on the answer.
   *
   * @param data - What the dialog says.
   * @param onConfirm - What to do if they agree.
   */
  private ask(
    data: ReturnType<typeof deletionConfirmation>,
    onConfirm: () => void,
  ): void {
    this._dialog
      .open(ConfirmDialogComponent, { width: '75%', data })
      .afterClosed()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(confirmed => {
        if (confirmed) {
          onConfirm();
        }
      });
  }
}
