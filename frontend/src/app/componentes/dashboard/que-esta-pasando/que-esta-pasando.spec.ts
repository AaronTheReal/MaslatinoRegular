import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueEstaPasando } from './que-esta-pasando';

describe('QueEstaPasando', () => {
  let component: QueEstaPasando;
  let fixture: ComponentFixture<QueEstaPasando>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueEstaPasando]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QueEstaPasando);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
