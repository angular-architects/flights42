import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MilesFeatureNextLevel } from './miles-feature-next-level';

describe('MilesFeatureNextLevel', () => {
  let component: MilesFeatureNextLevel;
  let fixture: ComponentFixture<MilesFeatureNextLevel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MilesFeatureNextLevel],
    }).compileComponents();

    fixture = TestBed.createComponent(MilesFeatureNextLevel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
