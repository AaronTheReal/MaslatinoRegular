import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParteHangout } from './parte-hangout';

describe('ParteHangout', () => {
  let component: ParteHangout;
  let fixture: ComponentFixture<ParteHangout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParteHangout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParteHangout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
