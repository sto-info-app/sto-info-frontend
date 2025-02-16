import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

export function setComponentProperties<T>(
  fixture: ComponentFixture<T>,
  component: T,
  properties: Partial<T>,
) {
  Object.assign(component as object, properties);
  fixture.detectChanges();
}

export function getMessageElement<T>(
  fixture: ComponentFixture<T>,
  selector: string,
) {
  return fixture.debugElement.query(By.css(selector));
}
