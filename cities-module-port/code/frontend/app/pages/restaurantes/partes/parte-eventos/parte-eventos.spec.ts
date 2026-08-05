import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParteEventos } from './parte-eventos';

describe('ParteEventos', () => {
  let component: ParteEventos;
  let fixture: ComponentFixture<ParteEventos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParteEventos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParteEventos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
