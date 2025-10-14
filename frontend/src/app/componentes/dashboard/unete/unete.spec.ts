import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Unete } from './unete';

describe('Unete', () => {
  let component: Unete;
  let fixture: ComponentFixture<Unete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Unete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Unete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
