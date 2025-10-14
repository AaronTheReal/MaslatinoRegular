import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperienciaTodo } from './experiencia-todo';

describe('ExperienciaTodo', () => {
  let component: ExperienciaTodo;
  let fixture: ComponentFixture<ExperienciaTodo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperienciaTodo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExperienciaTodo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
