import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicidadSecundaria } from './publicidad-secundaria';

describe('PublicidadSecundaria', () => {
  let component: PublicidadSecundaria;
  let fixture: ComponentFixture<PublicidadSecundaria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicidadSecundaria]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicidadSecundaria);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
