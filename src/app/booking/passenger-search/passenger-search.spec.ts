import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassengerSearch } from './passenger-search';

describe('PassengerSearch', () => {
  let component: PassengerSearch;
  let fixture: ComponentFixture<PassengerSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassengerSearch],
    }).compileComponents();

    fixture = TestBed.createComponent(PassengerSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
