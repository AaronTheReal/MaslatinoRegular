import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticiasRecientes } from './noticias-recientes';

describe('NoticiasRecientes', () => {
  let component: NoticiasRecientes;
  let fixture: ComponentFixture<NoticiasRecientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticiasRecientes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticiasRecientes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
