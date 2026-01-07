import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Data } from './data';

describe('Data', () => {
  let component: Data;
  let fixture: ComponentFixture<Data>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Data],
    }).compileComponents();

    fixture = TestBed.createComponent(Data);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
