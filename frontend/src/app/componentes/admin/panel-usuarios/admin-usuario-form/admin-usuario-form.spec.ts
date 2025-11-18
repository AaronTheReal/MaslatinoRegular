import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUsuarioForm } from './admin-usuario-form';

describe('AdminUsuarioForm', () => {
  let component: AdminUsuarioForm;
  let fixture: ComponentFixture<AdminUsuarioForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsuarioForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminUsuarioForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
