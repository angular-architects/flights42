import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassengerCard } from './passenger-card';

describe('PassengerCard', () => {
  let component: PassengerCard;
  let fixture: ComponentFixture<PassengerCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassengerCard],
    }).compileComponents();

    fixture = TestBed.createComponent(PassengerCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
