import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MilesUiCommon } from './miles-ui-common';

describe('MilesUiCommon', () => {
  let component: MilesUiCommon;
  let fixture: ComponentFixture<MilesUiCommon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MilesUiCommon],
    }).compileComponents();

    fixture = TestBed.createComponent(MilesUiCommon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
