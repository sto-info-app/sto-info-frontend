import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ResourcesComponent } from './resources.component';

describe('ResourcesComponent', () => {
  let component: ResourcesComponent;
  let fixture: ComponentFixture<ResourcesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ResourcesComponent],
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
    fixture = TestBed.createComponent(ResourcesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists the STO Keybind Tool among the build tools (#1444)', () => {
    const tools = component.resourceLinks.find(
      section => section.heading === 'Build Tools & DPS Resources',
    );

    expect(tools?.links).toContainEqual({
      label: 'STO Keybind Tool',
      url: 'https://keybind.sto-tools.org/',
      description: 'Build keybind files for Star Trek Online',
    });
  });

  it('should expose resource links', () => {
    expect(component.resourceLinks.length).toBeGreaterThan(0);
  });
});
