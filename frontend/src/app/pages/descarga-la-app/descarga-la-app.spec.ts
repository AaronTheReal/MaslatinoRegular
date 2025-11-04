import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DescargaLaApp } from './descarga-la-app';

describe('DescargaLaApp', () => {
  let component: DescargaLaApp;
  let fixture: ComponentFixture<DescargaLaApp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DescargaLaApp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DescargaLaApp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
