import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import {
  faArrowUpRightFromSquare,
  faSquareXmark,
} from '@awesome.me/kit-5812c6b103/icons/classic/solid';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { of } from 'rxjs';

import { TermsOfUseComponent } from './terms-of-use.component';

describe('TermsOfUseComponent', () => {
  let component: TermsOfUseComponent;
  let fixture: ComponentFixture<TermsOfUseComponent>;
  let library: FaIconLibrary;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsOfUseComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map(), data: {} },
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    library = TestBed.inject(FaIconLibrary);
    library.addIcons(faArrowUpRightFromSquare, faSquareXmark);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TermsOfUseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
