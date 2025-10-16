import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelNoticias } from './panel-noticias';

describe('PanelNoticias', () => {
  let component: PanelNoticias;
  let fixture: ComponentFixture<PanelNoticias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelNoticias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelNoticias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
