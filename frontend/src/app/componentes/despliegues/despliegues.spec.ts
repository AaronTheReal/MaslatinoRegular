import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Despliegues } from './despliegues';

describe('Despliegues', () => {
  let component: Despliegues;
  let fixture: ComponentFixture<Despliegues>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Despliegues]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Despliegues);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
