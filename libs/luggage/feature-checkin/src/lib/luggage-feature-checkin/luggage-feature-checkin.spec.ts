import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuggageFeatureCheckin } from './luggage-feature-checkin';

describe('LuggageFeatureCheckin', () => {
  let component: LuggageFeatureCheckin;
  let fixture: ComponentFixture<LuggageFeatureCheckin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LuggageFeatureCheckin],
    }).compileComponents();

    fixture = TestBed.createComponent(LuggageFeatureCheckin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
