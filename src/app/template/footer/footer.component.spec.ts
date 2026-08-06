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

  it('should link to Community from the first link column', () => {
    const columns = fixture.nativeElement.querySelectorAll('.footer-list-col');
    const firstColumnLinks: string[] = Array.from(
      columns[0].querySelectorAll('a'),
      (link: HTMLAnchorElement) => link.textContent?.trim() ?? '',
    );

    expect(firstColumnLinks).toContain('Community');
  });
});
