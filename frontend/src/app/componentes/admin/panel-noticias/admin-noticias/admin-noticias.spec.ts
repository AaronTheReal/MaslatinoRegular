import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminNoticias } from './admin-noticias';

describe('AdminNoticias', () => {
  let component: AdminNoticias;
  let fixture: ComponentFixture<AdminNoticias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminNoticias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminNoticias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
