import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarruselEventos } from './carrusel-eventos';

describe('CarruselEventos', () => {
  let component: CarruselEventos;
  let fixture: ComponentFixture<CarruselEventos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarruselEventos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarruselEventos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
