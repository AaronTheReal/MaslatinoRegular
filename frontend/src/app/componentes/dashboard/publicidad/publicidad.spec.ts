import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Publicidad } from './publicidad';

describe('Publicidad', () => {
  let component: Publicidad;
  let fixture: ComponentFixture<Publicidad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Publicidad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Publicidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
