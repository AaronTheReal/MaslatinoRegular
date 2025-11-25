import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RadioPlayer } from './radio-player';

describe('RadioPlayer', () => {
  let component: RadioPlayer;
  let fixture: ComponentFixture<RadioPlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioPlayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RadioPlayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
