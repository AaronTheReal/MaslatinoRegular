import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticiasTodas } from './noticias-todas';

describe('NoticiasTodas', () => {
  let component: NoticiasTodas;
  let fixture: ComponentFixture<NoticiasTodas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticiasTodas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticiasTodas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
