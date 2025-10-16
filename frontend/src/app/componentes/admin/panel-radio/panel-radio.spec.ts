import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelRadio } from './panel-radio';

describe('PanelRadio', () => {
  let component: PanelRadio;
  let fixture: ComponentFixture<PanelRadio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelRadio]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelRadio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
