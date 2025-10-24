import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventoRow } from './evento-row';

describe('EventoRow', () => {
  let component: EventoRow;
  let fixture: ComponentFixture<EventoRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoRow]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventoRow);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
