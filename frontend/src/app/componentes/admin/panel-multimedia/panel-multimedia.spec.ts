import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelMultimedia } from './panel-multimedia';

describe('PanelMultimedia', () => {
  let component: PanelMultimedia;
  let fixture: ComponentFixture<PanelMultimedia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelMultimedia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelMultimedia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
