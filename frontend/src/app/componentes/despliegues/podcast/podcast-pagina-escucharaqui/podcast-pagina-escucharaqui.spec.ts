import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PodcastPaginaEscucharaqui } from './podcast-pagina-escucharaqui';

describe('PodcastPaginaEscucharaqui', () => {
  let component: PodcastPaginaEscucharaqui;
  let fixture: ComponentFixture<PodcastPaginaEscucharaqui>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastPaginaEscucharaqui]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PodcastPaginaEscucharaqui);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
