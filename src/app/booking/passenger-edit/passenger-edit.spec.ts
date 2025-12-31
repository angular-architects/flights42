import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassengerEdit } from './passenger-edit';

describe('PassengerEdit', () => {
  let component: PassengerEdit;
  let fixture: ComponentFixture<PassengerEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassengerEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(PassengerEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
