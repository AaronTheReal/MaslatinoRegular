import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MegaphonePlayerGlobal } from './megaphone-player-global';

describe('MegaphonePlayerGlobal', () => {
  let component: MegaphonePlayerGlobal;
  let fixture: ComponentFixture<MegaphonePlayerGlobal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MegaphonePlayerGlobal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MegaphonePlayerGlobal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
