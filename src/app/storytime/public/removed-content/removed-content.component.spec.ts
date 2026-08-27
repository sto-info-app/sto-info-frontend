import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RemovedContentComponent } from './removed-content.component';

describe('RemovedContentComponent', () => {
  let fixture: ComponentFixture<RemovedContentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RemovedContentComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(RemovedContentComponent);
    fixture.detectChanges();
  });

  it('is created', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // "There was never anything here" and "there was, and it was taken down" are
  // different answers, and a reader who followed a link is owed the second.
  it('says the content was removed rather than never existed', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('has been removed');
    expect(text).not.toContain('not found');
  });

  it('says the creator still has their work', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'It is not lost',
    );
  });

  it('offers the way back, and the rules', () => {
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.storytime-removed__actions a',
    );

    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toContain('content-policy');
  });
});
