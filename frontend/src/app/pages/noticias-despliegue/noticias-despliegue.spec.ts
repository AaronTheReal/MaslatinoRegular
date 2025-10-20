import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticiasDespliegue } from './noticias-despliegue';

describe('NoticiasDespliegue', () => {
  let component: NoticiasDespliegue;
  let fixture: ComponentFixture<NoticiasDespliegue>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticiasDespliegue]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticiasDespliegue);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
