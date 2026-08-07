import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  SRC_PHOTO_UNAVAILABLE_100PX,
  SRC_PHOTO_UNAVAILABLE_300PX,
} from '../../constants/app-image-assets.constants';
import { EntityAvatarComponent } from './entity-avatar.component';

describe('EntityAvatarComponent', () => {
  let fixture: ComponentFixture<EntityAvatarComponent>;
  let component: EntityAvatarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityAvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAvatarComponent);
    component = fixture.componentInstance;
    component.alt = 'Captain Picard';
  });

  it('should render the supplied image', () => {
    component.src = 'https://cdn.example.com/pic/square100';
    fixture.detectChanges();

    const img: HTMLImageElement =
      fixture.nativeElement.querySelector('.entity-avatar');
    expect(img.getAttribute('src')).toBe(
      'https://cdn.example.com/pic/square100',
    );
    expect(img.getAttribute('alt')).toBe('Captain Picard');
  });

  it('should use the 100px placeholder when no image is supplied', () => {
    component.src = null;
    fixture.detectChanges();

    expect(component.displaySrc).toBe(SRC_PHOTO_UNAVAILABLE_100PX);
  });

  it('should use the 300px placeholder at the larger size', () => {
    component.src = null;
    component.size = 300;
    fixture.detectChanges();

    expect(component.displaySrc).toBe(SRC_PHOTO_UNAVAILABLE_300PX);
  });

  it('should fall back to the placeholder when the image fails to load', () => {
    component.src = 'https://cdn.example.com/broken';
    fixture.detectChanges();

    const img: HTMLImageElement =
      fixture.nativeElement.querySelector('.entity-avatar');
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(component.hasFailed).toBe(true);
    expect(component.displaySrc).toBe(SRC_PHOTO_UNAVAILABLE_100PX);
  });

  it('should reset the failure flag when the src input changes', () => {
    component.src = 'https://cdn.example.com/broken';
    fixture.detectChanges();

    const img: HTMLImageElement =
      fixture.nativeElement.querySelector('.entity-avatar');
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(component.hasFailed).toBe(true);

    component.src = 'https://cdn.example.com/pic/recovered';
    fixture.detectChanges();

    expect(component.hasFailed).toBe(false);
    expect(component.displaySrc).toBe('https://cdn.example.com/pic/recovered');
  });

  it('should render the size as the width and height attributes', () => {
    component.size = 300;
    fixture.detectChanges();

    const img: HTMLImageElement =
      fixture.nativeElement.querySelector('.entity-avatar');
    expect(img.getAttribute('width')).toBe('300');
    expect(img.getAttribute('height')).toBe('300');
  });
});
