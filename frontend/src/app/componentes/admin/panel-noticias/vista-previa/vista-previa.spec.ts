import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaPrevia } from './vista-previa';

describe('VistaPrevia', () => {
  let component: VistaPrevia;
  let fixture: ComponentFixture<VistaPrevia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaPrevia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VistaPrevia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
