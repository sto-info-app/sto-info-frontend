import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faArrowUpRightFromSquare,
  faSquareXmark,
} from '@fortawesome/free-solid-svg-icons';
import { of } from 'rxjs';

import { CreditsComponent } from './credits.component';

describe('CreditsComponent', () => {
  let component: CreditsComponent;
  let fixture: ComponentFixture<CreditsComponent>;
  let library: FaIconLibrary;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CreditsComponent],
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
    library = TestBed.inject(FaIconLibrary);
    library.addIcons(faArrowUpRightFromSquare, faSquareXmark);
    fixture = TestBed.createComponent(CreditsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
