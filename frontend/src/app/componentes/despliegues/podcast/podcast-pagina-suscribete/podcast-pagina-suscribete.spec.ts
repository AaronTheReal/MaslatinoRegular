import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PodcastPaginaSuscribete } from './podcast-pagina-suscribete';

describe('PodcastPaginaSuscribete', () => {
  let component: PodcastPaginaSuscribete;
  let fixture: ComponentFixture<PodcastPaginaSuscribete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastPaginaSuscribete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PodcastPaginaSuscribete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
