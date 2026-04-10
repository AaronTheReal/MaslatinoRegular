import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PodcastPagina } from './podcast-pagina';

describe('PodcastPagina', () => {
  let component: PodcastPagina;
  let fixture: ComponentFixture<PodcastPagina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastPagina]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PodcastPagina);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
