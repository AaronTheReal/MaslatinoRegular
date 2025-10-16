import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelPodcastPc } from './panel-podcast-pc';

describe('PanelPodcastPc', () => {
  let component: PanelPodcastPc;
  let fixture: ComponentFixture<PanelPodcastPc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelPodcastPc]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelPodcastPc);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
