import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParteTurismo } from './parte-turismo';

describe('ParteTurismo', () => {
  let component: ParteTurismo;
  let fixture: ComponentFixture<ParteTurismo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParteTurismo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParteTurismo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
