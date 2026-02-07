import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuggageDomain } from './luggage-domain';

describe('LuggageDomain', () => {
  let component: LuggageDomain;
  let fixture: ComponentFixture<LuggageDomain>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LuggageDomain],
    }).compileComponents();

    fixture = TestBed.createComponent(LuggageDomain);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
