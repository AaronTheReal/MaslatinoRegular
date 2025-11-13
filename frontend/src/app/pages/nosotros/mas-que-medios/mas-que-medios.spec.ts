import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasQueMedios } from './mas-que-medios';

describe('MasQueMedios', () => {
  let component: MasQueMedios;
  let fixture: ComponentFixture<MasQueMedios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasQueMedios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasQueMedios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
