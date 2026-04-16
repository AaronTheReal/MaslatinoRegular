import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioFloatingPlayerComponent } from './audio-floating-player.component';

describe('AudioFloatingPlayerComponent', () => {
  let component: AudioFloatingPlayerComponent;
  let fixture: ComponentFixture<AudioFloatingPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AudioFloatingPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AudioFloatingPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
