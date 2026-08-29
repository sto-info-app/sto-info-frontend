import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EditorActionsComponent } from './editor-actions.component';

describe('EditorActionsComponent', () => {
  let fixture: ComponentFixture<EditorActionsComponent>;

  const render = (): HTMLElement => {
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  const publishButton = (element: HTMLElement): HTMLButtonElement | undefined =>
    [...element.querySelectorAll('button')].find(button =>
      button.textContent?.includes('Save and publish'),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorActionsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorActionsComponent);
    fixture.componentInstance.cancelLink = ['/', 'storytime', 'manage'];
  });

  it('is defined', () => {
    expect(render()).toBeTruthy();
  });

  it('offers a save and a way out', () => {
    const element = render();

    expect(element.querySelector('button')?.textContent).toContain('Save');
    expect(element.querySelector('a')?.textContent).toContain('Cancel');
  });

  // A button that could only ever be refused is worse than no button, so
  // publishing appears only where the editor says it would be accepted.
  it('offers no publish unless the editor says it is possible', () => {
    expect(publishButton(render())).toBeUndefined();
  });

  it('offers a publish when the editor says it is possible', () => {
    fixture.componentInstance.canPublish = true;

    expect(publishButton(render())).toBeDefined();
  });

  it('asks the editor to publish when the publish is pressed', () => {
    const asked = jest.fn();

    fixture.componentInstance.canPublish = true;
    fixture.componentInstance.publish.subscribe(asked);
    publishButton(render())?.click();

    expect(asked).toHaveBeenCalled();
  });

  // Both buttons go dead while a save is in flight, so a second press cannot
  // send the same work twice.
  it('says so and stops taking presses while saving', () => {
    fixture.componentInstance.canPublish = true;
    fixture.componentInstance.isSaving = true;

    const element = render();
    const buttons = [...element.querySelectorAll('button')];

    expect(element.textContent).toContain('Saving…');
    expect(buttons.every(button => button.disabled)).toBe(true);
  });

  // A row that sits outside the form it submits is tied back to it by name.
  it('names the form it submits when it stands outside one', () => {
    fixture.componentInstance.formId = 'chapter-editor-form';

    expect(render().querySelector('button')?.getAttribute('form')).toBe(
      'chapter-editor-form',
    );
  });

  it('names no form when it sits inside the one it submits', () => {
    expect(render().querySelector('button')?.getAttribute('form')).toBeNull();
  });
});
