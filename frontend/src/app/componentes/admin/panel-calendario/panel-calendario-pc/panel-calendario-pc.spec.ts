import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelCalendarioPc } from './panel-calendario-pc';

describe('PanelCalendarioPc', () => {
  let component: PanelCalendarioPc;
  let fixture: ComponentFixture<PanelCalendarioPc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelCalendarioPc]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelCalendarioPc);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
