import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeccionConectando } from './seccion-conectando';

describe('SeccionConectando', () => {
  let component: SeccionConectando;
  let fixture: ComponentFixture<SeccionConectando>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionConectando]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeccionConectando);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
