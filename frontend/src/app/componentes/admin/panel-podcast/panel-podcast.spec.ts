import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelPodcast } from './panel-podcast';

describe('PanelPodcast', () => {
  let component: PanelPodcast;
  let fixture: ComponentFixture<PanelPodcast>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelPodcast]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelPodcast);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
