import { expect, Locator, Page } from '@playwright/test';

/**
 * The Custom Tracking settings screen, expressed once so that eleven journeys
 * do not each describe it again.
 *
 * Every locator here goes through a role, a label or visible text. There is
 * not a single test-only attribute in the application, and that is deliberate:
 * if a journey cannot find a control by its accessible name, neither can
 * somebody using a screen reader, and the journey failing is the right
 * outcome. It also means the interface can be restyled freely — only renaming
 * a control breaks these, and renaming a control is a change worth noticing.
 */

export type Scope = 'Accounts' | 'Characters';

export interface GroupOptions {
  description?: string;
  publiclyVisible?: boolean;
}

export interface FieldOptions extends GroupOptions {
  /** The field type's own name, e.g. TEXT_SINGLE_LINE — not its label. */
  type: string;
  required?: boolean;

  /**
   * Settings particular to the type, keyed by the label the form gives them
   * ("Crop shape") rather than by the key underneath. What somebody reading
   * the form would look for is the right thing for a journey to look for too.
   */
  settings?: Record<string, string>;
}

export class CustomTrackingPage {
  /**
   * The sections this test made, so they can be taken away again.
   *
   * A member may hold ten sections per scope, and the journeys and reviews
   * together want more than that. Leaving them to accumulate made whichever
   * test ran eleventh fail for a reason that had nothing to do with it — so
   * each test now clears up after itself, and every one of them starts from
   * the same amount of room.
   */
  private readonly _created: { scope: Scope; name: string }[] = [];

  private _scope: Scope = 'Accounts';

  constructor(private readonly _page: Page) {}

  /** The builder half of the screen. */
  get definitions(): Locator {
    return this._page.locator('#custom-tracking-panel-definitions');
  }

  /** The recording half of the screen. */
  get values(): Locator {
    return this._page.locator('#custom-tracking-panel-values');
  }

  /** Whichever editor form is open; only ever one at a time. */
  private form(heading: RegExp): Locator {
    return this._page
      .locator('form')
      .filter({ has: this._page.getByRole('heading', { name: heading }) });
  }

  async goto(): Promise<void> {
    await this._page.goto('/dashboard/settings/custom-tracking');
    await expect(
      this._page.getByRole('heading', { name: 'Custom Tracking', level: 1 }),
    ).toBeVisible();
  }

  /** Accept the content agreement, if this member has not already. */
  async acceptAgreement(): Promise<void> {
    const consent = this._page.getByLabel(
      /I have read and will follow the Terms of Use/,
    );

    await expect(consent).toBeVisible();
    await consent.check();
    await this._page.getByRole('button', { name: 'I agree' }).click();
    await expect(
      this._page.getByRole('tab', { name: 'What you track' }),
    ).toBeVisible();
  }

  /**
   * Open the screen ready to work, accepting the agreement if this member has
   * not yet been asked. Journey 1 accepts it deliberately and asserts on it;
   * every other journey only needs to be past it.
   */
  async openReady(): Promise<void> {
    await this.goto();

    const consent = this._page.getByLabel(
      /I have read and will follow the Terms of Use/,
    );
    const builder = this._page.getByRole('tab', { name: 'What you track' });

    // Both arrive from the server, so waiting for whichever comes has to
    // happen before asking which one it was. Asking straight away found
    // neither, decided the agreement was not needed, and then waited out the
    // clock for a builder that was never going to be shown.
    await expect(consent.or(builder).first()).toBeVisible();

    if (await consent.isVisible()) {
      await this.acceptAgreement();
    }
  }

  async show(
    panel: 'What you track' | 'What you have recorded' | 'About and the rules',
  ): Promise<void> {
    await this._page.getByRole('tab', { name: panel }).click();
  }

  /** Choose Accounts or Characters, in whichever half is on screen. */
  async chooseScope(within: Locator, scope: Scope): Promise<void> {
    this._scope = scope;
    await within.getByRole('button', { name: scope, exact: true }).click();
  }

  /**
   * The caret on a section's heading bar, which folds it away and opens it.
   *
   * Named for what pressing it would do and for the section it would do it to
   * — "Expand Fleet" — which is what keeps it from matching "Fleet holdings"
   * as well, and from finding Edit, Delete or Move up instead.
   */
  panelToggle(name: string): Locator {
    return this._page.getByRole('button', {
      name: new RegExp(`^(Expand|Collapse) ${escapeForRegExp(name)}$`),
    });
  }

  /** Open a section if it is not already open. */
  async expand(name: string): Promise<void> {
    const toggle = this.panelToggle(name);

    await expect(toggle).toBeVisible();

    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
    }

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }

  /**
   * Bring one of a section's tabs to the front.
   *
   * A tab is one of a strip rather than a panel that folds away, so this
   * chooses it rather than opening it. The section holding it has to be open
   * already, because the strip is inside the section.
   */
  async showTab(name: string): Promise<void> {
    const tab = this._page.getByRole('tab', { name, exact: true });

    await expect(tab).toBeVisible();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  async addSection(name: string, options: GroupOptions = {}): Promise<void> {
    await this.definitions
      .getByRole('button', { name: 'Add a section' })
      .click();
    await this._fillGroupForm(/^New section/, name, options);
    await expect(this.panelToggle(name)).toBeVisible();
    this._created.push({ scope: this._scope, name });
  }

  async addTab(
    sectionName: string,
    name: string,
    options: GroupOptions = {},
  ): Promise<void> {
    await this.expand(sectionName);
    await this._page
      .getByRole('button', { name: `Add a tab to ${sectionName}` })
      .click();
    await this._fillGroupForm(/^New tab/, name, options);
    await expect(
      this._page.getByRole('tab', { name, exact: true }),
    ).toBeVisible();
  }

  async addField(
    tabName: string,
    name: string,
    options: FieldOptions,
  ): Promise<void> {
    await this.showTab(tabName);
    await this._page
      .getByRole('button', { name: `Add a field to ${tabName}` })
      .click();

    const form = this.form(/^New field/);

    await form
      .getByLabel('What this field asks for')
      .selectOption({ value: options.type });
    await form.getByLabel('Name', { exact: true }).fill(name);

    if (options.description) {
      await form.getByLabel('Description').fill(options.description);
    }

    if (options.required) {
      await form
        .getByRole('switch', { name: 'Every record must answer this' })
        .click();
    }

    if (options.publiclyVisible) {
      await form
        .getByRole('switch', { name: 'Show this field publicly' })
        .click();
    }

    for (const [label, value] of Object.entries(options.settings ?? {})) {
      await form.getByLabel(label, { exact: true }).selectOption(value);
    }

    await form.getByRole('button', { name: 'Create' }).click();
    await expect(
      this._page.getByText(name, { exact: true }).first(),
    ).toBeVisible();
  }

  /**
   * Build the smallest thing worth publishing: one section, one tab, one
   * field.
   *
   * Half of these journeys are about what happens to a published answer rather
   * than about the building of it, and each of them was opening with the same
   * dozen lines. Written once, they can differ where they mean to.
   */
  async buildOneField(shape: {
    section: string;
    tab: string;
    field: string;
    type: string;
    publiclyVisible?: boolean;
  }): Promise<void> {
    await this.chooseScope(this.definitions, 'Accounts');
    await this.addSection(shape.section, {
      publiclyVisible: shape.publiclyVisible,
    });
    await this.addTab(shape.section, shape.tab, {
      publiclyVisible: shape.publiclyVisible,
    });
    await this.addField(shape.tab, shape.field, {
      type: shape.type,
      publiclyVisible: shape.publiclyVisible,
    });
  }

  /** Answer one field against one account, and wait for it to be saved. */
  async recordAnswer(
    target: string,
    field: string,
    answer: string,
  ): Promise<void> {
    await this.show('What you have recorded');
    await this.chooseScope(this.values, 'Accounts');
    await this.chooseTarget(target);
    await this.values.getByLabel(field, { exact: true }).fill(answer);
    await this.saveRecord();
    await expect(this.savedConfirmation).toBeVisible();
  }

  /** Add a choice or tag to the field whose editor is open. */
  async addOption(noun: 'choice' | 'tag', label: string): Promise<void> {
    await this._page.getByLabel(`Add a ${noun}`).fill(label);
    await this._page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(
      this._page.getByRole('button', { name: `Rename ${label}` }),
    ).toBeVisible();
  }

  /** Open a field's editor, which is also where its choices are managed. */
  async editField(name: string): Promise<void> {
    await this._page.getByRole('button', { name: `Edit ${name}` }).click();
    await expect(this.form(/^Edit field/)).toBeVisible();
  }

  /** Take a choice out of circulation without deleting it. */
  async withdrawOption(label: string): Promise<void> {
    await this._page.getByRole('button', { name: `Withdraw ${label}` }).click();
    await expect(
      this._page.getByRole('heading', { name: 'Withdrawn' }),
    ).toBeVisible();
  }

  /**
   * Publish, or unpublish, one level of the chain.
   *
   * The switch is set rather than pressed, because a journey that walks the
   * truth table asks for the same state twice in places and a press would
   * undo it.
   */
  async setPublic(
    kind: 'section' | 'tab' | 'field',
    name: string,
    isPublic: boolean,
  ): Promise<void> {
    await this._page.getByRole('button', { name: `Edit ${name}` }).click();

    const form = this.form(new RegExp(`^Edit ${kind}`));
    const toggle = form.getByRole('switch', {
      name: `Show this ${kind} publicly`,
    });

    await expect(toggle).toBeVisible();

    if (((await toggle.getAttribute('aria-checked')) === 'true') !== isPublic) {
      await toggle.click();
    }

    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
  }

  /** Delete a section, tab or field, and agree to the consequences. */
  async remove(name: string): Promise<void> {
    await this._page.getByRole('button', { name: `Delete ${name}` }).click();

    const dialog = this._page.getByRole('dialog');

    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(dialog).toBeHidden();
  }

  /** Choose which account or character is being filled in. */
  async chooseTarget(label: string): Promise<void> {
    await this.values
      .getByLabel('Which record to fill in')
      .selectOption({ label });
  }

  /** What this member can record against, in the order they are offered. */
  async targetLabels(): Promise<string[]> {
    const options = this.values
      .getByLabel('Which record to fill in')
      .locator('option');

    return (await options.allTextContents()).map(label => label.trim());
  }

  async saveRecord(): Promise<void> {
    await this.values.getByRole('button', { name: 'Save this record' }).click();
  }

  /** The whole-record confirmation, matched on its sentence rather than the
   * word "Saved", which also appears in the hint beneath the buttons. */
  get savedConfirmation(): Locator {
    return this._page.getByText(/Everything on this record is as it is here/);
  }

  /**
   * Delete whatever this test built, so the next one starts with room.
   *
   * Anything already gone — journey 9 deletes its own section on purpose — is
   * passed over. A failure here is left to fail the test: a broken tidy-up
   * that stayed quiet would show up several files later as a ceiling nobody
   * could account for.
   */
  async tidyUp(): Promise<void> {
    if (this._created.length === 0) {
      return;
    }

    await this.goto();

    for (const { scope, name } of [...this._created].reverse()) {
      await this.show('What you track');
      await this.chooseScope(this.definitions, scope);

      if ((await this.panelToggle(name).count()) > 0) {
        await this.remove(name);
      }
    }

    this._created.length = 0;
  }

  private async _fillGroupForm(
    heading: RegExp,
    name: string,
    options: GroupOptions,
  ): Promise<void> {
    const form = this.form(heading);

    await expect(form).toBeVisible();
    await form.getByLabel('Name', { exact: true }).fill(name);

    if (options.description) {
      await form.getByLabel('Description').fill(options.description);
    }

    if (options.publiclyVisible) {
      await form.getByRole('switch', { name: /^Show this/ }).click();
    }

    await form.getByRole('button', { name: 'Create' }).click();
  }
}

/** A member's own name goes into a pattern, so it has to be treated as text. */
export function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
