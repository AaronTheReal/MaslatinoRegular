import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeccionTecnologia } from './seccion-tecnologia';

describe('SeccionTecnologia', () => {
  let component: SeccionTecnologia;
  let fixture: ComponentFixture<SeccionTecnologia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionTecnologia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeccionTecnologia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
