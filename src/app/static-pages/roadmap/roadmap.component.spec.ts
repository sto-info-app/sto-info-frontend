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

  // Fleet Communities shipped in v1.5.1, so it has moved from In Progress
  // to the end of Complete.
  it('lists Fleet Communities as the latest completed entry', () => {
    const latest = component.complete[component.complete.length - 1];

    expect(latest.title).toBe('Fleet Communities');
    expect(latest.details.length).toBeGreaterThan(0);
    expect(component.inProgress).toEqual([]);
  });

  it('gives each list section its items, and Complete none', () => {
    expect(component.itemsOf('planned')).toBe(component.planned);
    expect(component.itemsOf('inProgress')).toBe(component.inProgress);
    expect(component.itemsOf('futureIdeas')).toBe(component.futureIdeas);
    expect(component.itemsOf('complete')).toEqual([]);
  });

  // Complete is always shown; a list section only while it has items. With
  // In Progress and Future Ideas empty, Planned and Complete remain.
  it('shows Complete and only the list sections that have items', () => {
    expect(component.sections.map(section => section.key)).toEqual([
      'planned',
      'complete',
    ]);
  });

  it('draws a list section with its items', () => {
    const planned: HTMLElement =
      fixture.nativeElement.querySelector('#planned');

    expect(
      Array.from(planned.querySelectorAll('.lcars-list li')).map(item =>
        item.textContent?.trim(),
      ),
    ).toEqual(component.planned);
  });

  // An empty section is left out of the page and of the side column's links
  // alike, so nothing points at a bar that is not there.
  it('leaves an empty section out of the page and the side links', () => {
    const page: HTMLElement = fixture.nativeElement;

    expect(page.querySelector('#in-progress')).toBeNull();
    expect(page.querySelector('#future-ideas')).toBeNull();
    expect(
      Array.from(page.querySelectorAll('#roadmap-side-column a')).map(link =>
        link.getAttribute('href'),
      ),
    ).toEqual(['/roadmap#planned', '/roadmap#complete']);
  });

  // Every section opens unfolded, as every collapsible section does.
  it('draws each shown section as a collapsible section, anchored by its id', () => {
    const sections: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll(
        '#roadmap-main-column app-collapsible-section',
      ),
    );

    expect(sections.map(section => section.id)).toEqual(
      component.sections.map(section => section.anchorId),
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
