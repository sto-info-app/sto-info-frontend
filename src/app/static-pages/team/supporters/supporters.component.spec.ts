import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { TeamSupportersComponent } from './supporters.component';

describe('TeamSupportersComponent', () => {
  let component: TeamSupportersComponent;
  let fixture: ComponentFixture<TeamSupportersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamSupportersComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamSupportersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list current and past supporters', () => {
    expect(component.currentSupporters).toEqual(expect.any(Array));
    expect(component.pastSupporters).toEqual(expect.any(Array));
  });
});
