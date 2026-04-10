import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PodcastPaginaEpisodios } from './podcast-pagina-episodios';

describe('PodcastPaginaEpisodios', () => {
  let component: PodcastPaginaEpisodios;
  let fixture: ComponentFixture<PodcastPaginaEpisodios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastPaginaEpisodios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PodcastPaginaEpisodios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
