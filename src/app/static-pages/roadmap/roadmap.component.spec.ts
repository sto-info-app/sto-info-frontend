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

  // Every section opens unfolded, as every collapsible section does.
  it('draws each section as a collapsible section, anchored by its id', () => {
    const sections: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll(
        '#roadmap-main-column app-collapsible-section',
      ),
    );

    expect(sections.map(section => section.id)).toEqual(
      component.sectionMeta.map(section => section.anchorId),
    );
    sections.forEach(section =>
      expect(
        section
          .querySelector('.collapsible-section__content')
          ?.hasAttribute('hidden'),
      ).toBe(false),
    );
  });

  it('should define side navigation anchors for each section', () => {
    expect(component.sectionMeta).toHaveLength(4);
    component.sectionMeta.forEach(section => {
      expect(section.anchorId.length).toBeGreaterThan(0);
    });
  });
});
