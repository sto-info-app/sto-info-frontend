import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EndeavourRankBadgeComponent } from './endeavour-rank-badge.component';

describe('EndeavourRankBadgeComponent', () => {
  let component: EndeavourRankBadgeComponent;
  let fixture: ComponentFixture<EndeavourRankBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EndeavourRankBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EndeavourRankBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return a zero-padded rank display', () => {
    component.totalNodes = 9;
    expect(component.rankDisplay).toBe('0009');
  });

  it('should return non-truncated display for larger values', () => {
    component.totalNodes = 12345;
    expect(component.rankDisplay).toBe('12345');
  });
});
