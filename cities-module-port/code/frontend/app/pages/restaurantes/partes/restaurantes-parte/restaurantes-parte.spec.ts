import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantesParte } from './restaurantes-parte';

describe('RestaurantesParte', () => {
  let component: RestaurantesParte;
  let fixture: ComponentFixture<RestaurantesParte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantesParte]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestaurantesParte);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
