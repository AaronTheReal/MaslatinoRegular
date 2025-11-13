import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MegaphonePlayer } from './megaphone-player';

describe('MegaphonePlayer', () => {
  let component: MegaphonePlayer;
  let fixture: ComponentFixture<MegaphonePlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MegaphonePlayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MegaphonePlayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
