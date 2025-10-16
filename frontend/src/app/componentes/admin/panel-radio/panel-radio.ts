import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RadioService, RadioData } from './../../../services/radio-service';

@Component({
  selector: 'app-panel-radio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './panel-radio.html',
  styleUrls: ['./panel-radio.css']
})
export class PanelRadio {
  radioForm: FormGroup;
  submitted = false;
  successMessage = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private radioService: RadioService) {
    this.radioForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      image: ['', Validators.required],
      scriptEmbed: ['', [Validators.required, Validators.pattern(/<script.*<\/script>/)]],
      categories: [[], Validators.required],
      tags: [''],
      language: ['es']
    });
  }

  onSubmit() {
    this.submitted = true;
    if (this.radioForm.invalid) return;

    const rawData = this.radioForm.value;

    const radioData: RadioData = {
      ...rawData,
      tags: rawData.tags ? rawData.tags.split(',').map((tag: string) => tag.trim()) : [],
      categories: Array.isArray(rawData.categories)
        ? rawData.categories
        : [rawData.categories]
    };

    this.radioService.guardarRadio(radioData).subscribe({
      next: (res) => {
        this.successMessage = '🎉 Estación guardada correctamente';
        this.radioForm.reset();
        this.submitted = false;
      },
      error: (err) => {
        this.errorMessage = '❌ Error al guardar la estación';
        console.error(err);
      }
    });
  }
}





/*
import { Component, AfterViewInit, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-panel-radio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-radio.html',
  styleUrls: ['./panel-radio.css']
})
export class PanelRadio implements AfterViewInit {
  @ViewChild('playerContainer', { static: true }) playerContainer!: ElementRef;

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit(): void {
    const script = this.renderer.createElement('script');
    script.src = 'https://embed.radio.co/player/eb3a7a9.js';
    script.async = true;
    this.renderer.appendChild(this.playerContainer.nativeElement, script);
  }
}

*/