import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeccionPlataforma } from './seccion-plataforma';

describe('SeccionPlataforma', () => {
  let component: SeccionPlataforma;
  let fixture: ComponentFixture<SeccionPlataforma>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionPlataforma]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeccionPlataforma);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
