import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProximaParada } from './proxima-parada';

describe('ProximaParada', () => {
  let component: ProximaParada;
  let fixture: ComponentFixture<ProximaParada>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProximaParada]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProximaParada);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
