import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelayStepperComponent } from './delay-stepper.component';

describe('DelayStepperComponent', () => {
  let component: DelayStepperComponent;
  let fixture: ComponentFixture<DelayStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelayStepperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DelayStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
