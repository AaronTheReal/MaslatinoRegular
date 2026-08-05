import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Restaurantes } from './restaurantes';

describe('Restaurantes', () => {
  let component: Restaurantes;
  let fixture: ComponentFixture<Restaurantes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Restaurantes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Restaurantes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
