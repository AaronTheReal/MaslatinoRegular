import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeccionPilares } from './seccion-pilares';

describe('SeccionPilares', () => {
  let component: SeccionPilares;
  let fixture: ComponentFixture<SeccionPilares>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionPilares]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeccionPilares);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
