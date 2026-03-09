import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StatInfoCardComponent } from './stat-info-card.component';

describe('StatInfoCardComponent', () => {
  let component: StatInfoCardComponent;
  let fixture: ComponentFixture<StatInfoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatInfoCardComponent],
      providers: [provideRouter([])],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StatInfoCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct default input values', () => {
    expect(component.label).toBe('');
    expect(component.value).toBe(0);
    expect(component.icon).toBe('');
    expect(component.color).toBe('sunflower');
    expect(component.size).toBeUndefined();
    expect(component.ctaText).toBeUndefined();
    expect(component.ctaLink).toBeUndefined();
  });

  it('should accept string and number values for value input', () => {
    component.value = 42;
    expect(component.value).toBe(42);

    component.value = 'N/A';
    expect(component.value).toBe('N/A');
  });

  it('should accept all size options', () => {
    const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];
    for (const size of sizes) {
      component.size = size;
      expect(component.size).toBe(size);
    }
  });

  it('should accept a string ctaLink', () => {
    component.ctaLink = '/dashboard/stats';
    expect(component.ctaLink).toBe('/dashboard/stats');
  });

  it('should accept an array ctaLink', () => {
    component.ctaLink = ['/dashboard', 'stats'];
    expect(component.ctaLink).toEqual(['/dashboard', 'stats']);
  });
});
