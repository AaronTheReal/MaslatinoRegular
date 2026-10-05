import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioFloatingPlayerComponent } from './audio-floating-player.component';
import { AudioPlayerService } from '../../services/audio-player.service';

describe('AudioFloatingPlayerComponent', () => {
  let component: AudioFloatingPlayerComponent;
  let fixture: ComponentFixture<AudioFloatingPlayerComponent>;
  let audioPlayer: AudioPlayerService;
  let importarMux: jasmine.Spy;
  let muxYaCargado: jasmine.Spy;

  const episodio = { playbackId: 'abc123', title: 'Episodio de prueba' };
  const motorDeAudio = () => fixture.nativeElement.querySelector('mux-player');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AudioFloatingPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AudioFloatingPlayerComponent);
    component = fixture.componentInstance;
    audioPlayer = TestBed.inject(AudioPlayerService);
    // Ni red ni el módulo real: cada prueba decide si Mux ya estaba cargado.
    importarMux = spyOn<any>(component, 'importarMux').and.returnValue(Promise.resolve());
    muxYaCargado = spyOn<any>(component, 'muxYaCargado').and.returnValue(false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no descarga Mux mientras nadie abre el reproductor', () => {
    TestBed.tick();

    expect(importarMux).not.toHaveBeenCalled();
    expect(motorDeAudio()).toBeNull();
  });

  it('si Mux ya estaba cargado, pinta el reproductor en el mismo ciclo', () => {
    muxYaCargado.and.returnValue(true);

    audioPlayer.open(episodio);
    fixture.detectChanges();

    expect(importarMux).not.toHaveBeenCalled();
    expect(motorDeAudio()).not.toBeNull();
  });

  it('si no estaba, lo descarga al abrir y pinta el reproductor al terminar', async () => {
    audioPlayer.open(episodio);
    fixture.detectChanges();

    expect(importarMux).toHaveBeenCalledTimes(1);
    expect(motorDeAudio()).toBeNull();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(motorDeAudio()).not.toBeNull();
  });

  it('no lo vuelve a pedir al cerrar y abrir otra vez', async () => {
    audioPlayer.open(episodio);
    fixture.detectChanges();
    await fixture.whenStable();

    audioPlayer.close();
    fixture.detectChanges();
    audioPlayer.open(episodio);
    fixture.detectChanges();

    expect(importarMux).toHaveBeenCalledTimes(1);
    expect(motorDeAudio()).not.toBeNull();
  });
});
