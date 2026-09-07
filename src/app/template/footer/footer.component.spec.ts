import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map(), data: {} },
            queryParams: of({}),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Storytime link', () => {
    /**
     * Reads the footer's link labels.
     *
     * @returns The text of every footer link.
     */
    const linkLabels = (): string[] =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
      ).map(link => link.textContent?.trim() ?? '');

    // A link that appears and then disappears is worse than one that arrives
    // a moment late, so the default has to be hidden.
    it('should stay hidden before the feature state is known', () => {
      expect(component.isStorytimeOffered).toBe(false);
      expect(linkLabels()).not.toContain('Storytime');
    });

    it('should appear once the feature is switched on', () => {
      fixture.componentRef.setInput('isStorytimeOffered', true);
      fixture.detectChanges();

      expect(linkLabels()).toContain('Storytime');
    });

    // Somebody looking for what the site permits looks in the footer, and a
    // rights holder checking what is claimed about their property will not go
    // hunting through a fan-fiction section to find it.
    it.each([
      'Content Policy',
      'Storytime Terms of Use',
      'Fan Content & IP Notice',
    ])('should link to the %s once the feature is switched on', label => {
      fixture.componentRef.setInput('isStorytimeOffered', true);
      fixture.detectChanges();

      expect(linkLabels()).toContain(label);
    });

    it.each([
      'Content Policy',
      'Storytime Terms of Use',
      'Fan Content & IP Notice',
    ])('should hide the %s while the feature is off', label => {
      expect(linkLabels()).not.toContain(label);
    });
  });

  // The footer is the one part of the page a lost visitor is always looking
  // at, so help has to be reachable from it whatever else is switched on.
  it('should link to Help whether or not Storytime is switched on', () => {
    const linkLabels = (): string[] =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
      ).map(link => link.textContent?.trim() ?? '');

    expect(linkLabels()).toContain('Help');

    fixture.componentRef.setInput('isStorytimeOffered', true);
    fixture.detectChanges();

    expect(linkLabels()).toContain('Help');
  });

  // The terms and policies answer the questions the small print raises, so
  // they belong under it rather than among the navigation columns.
  describe('terms and policy links', () => {
    /**
     * Reads the label of every link in the terms and policy row.
     *
     * @returns The text of each legal link, in document order.
     */
    const legalLinkLabels = (): string[] =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '#footer-legal-links a',
        ),
      ).map(link => link.textContent?.trim() ?? '');

    it.each(['Privacy Policy', 'Terms of Use'])(
      'should show %s below the small print rather than in a link column',
      label => {
        expect(legalLinkLabels()).toContain(label);

        const columnLinks = Array.from(
          (fixture.nativeElement as HTMLElement).querySelectorAll(
            '.footer-list-col a',
          ),
        ).map(link => link.textContent?.trim() ?? '');

        expect(columnLinks).not.toContain(label);
      },
    );

    it.each([
      'Content Policy',
      'Storytime Terms of Use',
      'Fan Content & IP Notice',
    ])('should show %s below the small print once Storytime is on', label => {
      fixture.componentRef.setInput('isStorytimeOffered', true);
      fixture.detectChanges();

      expect(legalLinkLabels()).toContain(label);
    });

    // Below the small print, not merely elsewhere on the page: the ordering is
    // the whole point of keeping these out of the navigation columns.
    it('should follow the copyright text in the footer', () => {
      const element = fixture.nativeElement as HTMLElement;
      const copyright = element.querySelector('#copyright-text');
      const legalLinks = element.querySelector('#footer-legal-links');

      expect(copyright).not.toBeNull();
      expect(legalLinks).not.toBeNull();
      expect(copyright?.compareDocumentPosition(legalLinks as Node)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
  });

  it('should link to Community from the first link column', () => {
    const columns = fixture.nativeElement.querySelectorAll('.footer-list-col');
    const firstColumnLinks: string[] = Array.from(
      columns[0].querySelectorAll('a'),
      (link: HTMLAnchorElement) => link.textContent?.trim() ?? '',
    );

    expect(firstColumnLinks).toContain('Community');
  });
});
