import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParteFanzone } from './parte-fanzone';

describe('ParteFanzone', () => {
  let component: ParteFanzone;
  let fixture: ComponentFixture<ParteFanzone>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParteFanzone]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParteFanzone);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
