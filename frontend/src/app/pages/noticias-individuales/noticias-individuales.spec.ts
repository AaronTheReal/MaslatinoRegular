import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticiasIndividuales } from './noticias-individuales';

describe('NoticiasIndividuales', () => {
  let component: NoticiasIndividuales;
  let fixture: ComponentFixture<NoticiasIndividuales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticiasIndividuales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticiasIndividuales);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
