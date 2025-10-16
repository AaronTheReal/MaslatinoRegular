import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelCalendario } from './panel-calendario';

describe('PanelCalendario', () => {
  let component: PanelCalendario;
  let fixture: ComponentFixture<PanelCalendario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelCalendario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelCalendario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
