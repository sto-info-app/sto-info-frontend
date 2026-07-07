import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoadmapComponent } from './roadmap.component';

describe('RoadmapComponent', () => {
  let component: RoadmapComponent;
  let fixture: ComponentFixture<RoadmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoadmapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RoadmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should include shipped roadmap entries', () => {
    expect(component.complete.length).toBeGreaterThan(0);
  });

  it('should initialise all sections as expanded', () => {
    expect(component.sectionExpanded.complete).toBe(true);
    expect(component.sectionExpanded.inProgress).toBe(true);
    expect(component.sectionExpanded.planned).toBe(true);
    expect(component.sectionExpanded.futureIdeas).toBe(true);
  });

  it('should toggle section expansion state', () => {
    component.toggleSection('planned');
    expect(component.sectionExpanded.planned).toBe(false);

    component.toggleSection('planned');
    expect(component.sectionExpanded.planned).toBe(true);
  });

  it('should define side navigation anchors for each section', () => {
    expect(component.sectionMeta.length).toBe(4);
    component.sectionMeta.forEach(section => {
      expect(section.anchorId.length).toBeGreaterThan(0);
    });
  });
});
