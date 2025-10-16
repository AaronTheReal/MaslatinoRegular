import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelCategorias } from './panel-categorias';

describe('PanelCategorias', () => {
  let component: PanelCategorias;
  let fixture: ComponentFixture<PanelCategorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelCategorias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelCategorias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
