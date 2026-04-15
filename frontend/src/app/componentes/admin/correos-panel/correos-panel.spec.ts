import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorreosPanel } from './correos-panel';

describe('CorreosPanel', () => {
  let component: CorreosPanel;
  let fixture: ComponentFixture<CorreosPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CorreosPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorreosPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
