import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticiasRecomendadas } from './noticias-recomendadas';

describe('NoticiasRecomendadas', () => {
  let component: NoticiasRecomendadas;
  let fixture: ComponentFixture<NoticiasRecomendadas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticiasRecomendadas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticiasRecomendadas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
