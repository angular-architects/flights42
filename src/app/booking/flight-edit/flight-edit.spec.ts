import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlightEdit } from './flight-edit';

describe('FlightEdit', () => {
  let component: FlightEdit;
  let fixture: ComponentFixture<FlightEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(FlightEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
