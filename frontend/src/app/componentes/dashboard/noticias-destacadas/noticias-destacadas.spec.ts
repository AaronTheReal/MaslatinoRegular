import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticiasDestacadas } from './noticias-destacadas';

describe('NoticiasDestacadas', () => {
  let component: NoticiasDestacadas;
  let fixture: ComponentFixture<NoticiasDestacadas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticiasDestacadas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticiasDestacadas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
