import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureManage } from './feature-manage';

describe('FeatureManage', () => {
  let component: FeatureManage;
  let fixture: ComponentFixture<FeatureManage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureManage],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureManage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
