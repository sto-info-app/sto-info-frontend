import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MARKDOWN_REFERENCE,
  MARKDOWN_REFERENCE_NOTES,
} from '../../storytime-markdown.constants';
import { MarkdownReferenceComponent } from './markdown-reference.component';

describe('MarkdownReferenceComponent', () => {
  let fixture: ComponentFixture<MarkdownReferenceComponent>;

  /**
   * The whole reference as it reads on the page.
   *
   * @returns The rendered text.
   */
  const text = (): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MarkdownReferenceComponent] });

    fixture = TestBed.createComponent(MarkdownReferenceComponent);
    fixture.detectChanges();
  });

  // A reference that lists some of what the renderer accepts is worse than one
  // that lists none of it, because somebody concludes the rest is unsupported
  // and works around a thing that already works.
  it('shows every construct the reference holds', () => {
    const rendered = text();

    MARKDOWN_REFERENCE.forEach(group => {
      expect(rendered).toContain(group.heading);
      expect(rendered).toContain(group.intro);

      group.constructs.forEach(construct => {
        expect(rendered).toContain(construct.syntax);
        expect(rendered).toContain(construct.meaning);
      });
    });
  });

  it('shows the notes a two-column list cannot say', () => {
    MARKDOWN_REFERENCE_NOTES.forEach(note => {
      expect(text()).toContain(note);
    });
  });

  // The syntax is the one part that has to survive being read literally, so it
  // is marked up as code rather than left to sit in a sentence.
  it('marks the syntax as code', () => {
    const codes = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLElement>('dt code');

    expect(codes).toHaveLength(
      MARKDOWN_REFERENCE.reduce(
        (total, group) => total + group.constructs.length,
        0,
      ),
    );
  });
});
