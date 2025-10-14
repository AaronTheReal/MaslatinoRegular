import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Podcasts } from './podcasts';

describe('Podcasts', () => {
  let component: Podcasts;
  let fixture: ComponentFixture<Podcasts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Podcasts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Podcasts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
