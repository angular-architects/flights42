import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NextFlights } from './next-flights';

describe('NextFlights', () => {
  let component: NextFlights;
  let fixture: ComponentFixture<NextFlights>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NextFlights],
    }).compileComponents();

    fixture = TestBed.createComponent(NextFlights);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
