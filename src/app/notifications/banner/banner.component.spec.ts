import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import {
  Banner,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { NotificationService } from '../notification.service';
import { BannerComponent } from './banner.component';

describe('BannerComponent', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;
  let banners$: BehaviorSubject<Banner[]>;
  let serviceSpy: { banners$: Observable<Banner[]> };

  const banner: Banner = {
    id: 'b1',
    severity: NotificationSeverity.INFO,
    title: null,
    message: 'Hello',
    linkUrl: null,
    linkLabel: null,
    dismissible: true,
    active: true,
    startsAt: null,
    endsAt: null,
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(async () => {
    banners$ = new BehaviorSubject<Banner[]>([banner]);
    serviceSpy = { banners$ };
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [BannerComponent, HttpClientTestingModule],
      providers: [{ provide: NotificationService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(BannerComponent);
    component = fixture.componentInstance;
  });

  it('shows active banners from the stream', () => {
    fixture.detectChanges();
    expect(component.banners).toHaveLength(1);
  });

  it('reflects later stream emissions', () => {
    fixture.detectChanges();
    expect(component.banners).toHaveLength(1);
    banners$.next([]);
    expect(component.banners).toHaveLength(0);
  });

  it('dismisses a banner and remembers it', () => {
    fixture.detectChanges();
    component.dismiss(banner);
    expect(component.banners).toHaveLength(0);
    expect(localStorage.getItem('dismissed_banners')).toContain('b1');
  });

  it('hides previously dismissed banners', () => {
    localStorage.setItem('dismissed_banners', JSON.stringify(['b1']));
    fixture.detectChanges();
    expect(component.banners).toHaveLength(0);
  });

  it('does not re-store an already dismissed banner', () => {
    localStorage.setItem('dismissed_banners', JSON.stringify(['b1']));
    fixture.detectChanges();
    component.dismiss(banner);
    expect(
      JSON.parse(localStorage.getItem('dismissed_banners') ?? '[]'),
    ).toEqual(['b1']);
  });

  it('ignores non-array dismissal storage', () => {
    localStorage.setItem('dismissed_banners', JSON.stringify({ not: 'array' }));
    fixture.detectChanges();
    expect(component.banners).toHaveLength(1);
  });

  it('maps severity to the shared visual treatment', () => {
    const meta = component.severityMeta(banner);
    expect(meta.colourClass).toBe('severity-info');
    expect(meta.icon).toBe('fa-circle-info');
  });

  it('falls back to info treatment for an unknown severity', () => {
    const meta = component.severityMeta({
      ...banner,
      severity: 'BOGUS' as NotificationSeverity,
    });
    expect(meta.colourClass).toBe('severity-info');
  });

  it('fails silently when the banners stream errors', () => {
    serviceSpy.banners$ = throwError(() => new Error('boom'));
    fixture.detectChanges();
    expect(component.banners).toHaveLength(0);
  });

  it('tolerates unavailable localStorage when reading dismissals', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('blocked');
    });
    fixture.detectChanges();
    expect(component.banners).toHaveLength(1);
  });

  it('unsubscribes from the stream on destroy', () => {
    fixture.detectChanges();
    fixture.destroy();
    banners$.next([banner, { ...banner, id: 'b2' }]);
    expect(component.banners).toHaveLength(1);
  });

  it('detects external vs internal and empty links', () => {
    expect(component.isExternalLink('https://example.com')).toBe(true);
    expect(component.isExternalLink('/dashboard')).toBe(false);
    expect(component.isExternalLink(null)).toBe(false);
    expect(component.isExternalLink('http://[invalid')).toBe(false);
  });
});
