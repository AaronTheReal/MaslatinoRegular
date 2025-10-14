import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConectarRaices } from './conectar-raices';

describe('ConectarRaices', () => {
  let component: ConectarRaices;
  let fixture: ComponentFixture<ConectarRaices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConectarRaices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConectarRaices);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
