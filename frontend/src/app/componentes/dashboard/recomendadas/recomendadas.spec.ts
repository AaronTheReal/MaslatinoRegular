import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Recomendadas } from './recomendadas';

describe('Recomendadas', () => {
  let component: Recomendadas;
  let fixture: ComponentFixture<Recomendadas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Recomendadas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Recomendadas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
