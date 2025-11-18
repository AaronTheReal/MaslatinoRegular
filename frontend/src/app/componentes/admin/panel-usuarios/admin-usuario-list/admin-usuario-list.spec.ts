import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUsuarioList } from './admin-usuario-list';

describe('AdminUsuarioList', () => {
  let component: AdminUsuarioList;
  let fixture: ComponentFixture<AdminUsuarioList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsuarioList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminUsuarioList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
