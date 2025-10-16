import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarNoticias } from './editar-noticias';

describe('EditarNoticias', () => {
  let component: EditarNoticias;
  let fixture: ComponentFixture<EditarNoticias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarNoticias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarNoticias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
