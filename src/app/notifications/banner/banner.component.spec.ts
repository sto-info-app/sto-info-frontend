import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  Banner,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { NotificationService } from '../notification.service';
import { BannerComponent } from './banner.component';

describe('BannerComponent', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;
  let serviceSpy: jest.Mocked<Pick<NotificationService, 'getActiveBanners'>>;

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
    serviceSpy = { getActiveBanners: jest.fn(() => of([banner])) };
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [BannerComponent, HttpClientTestingModule],
      providers: [{ provide: NotificationService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(BannerComponent);
    component = fixture.componentInstance;
  });

  it('loads active banners on init', () => {
    fixture.detectChanges();
    expect(component.banners).toHaveLength(1);
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
});
