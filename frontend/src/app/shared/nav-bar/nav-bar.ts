import { Component, Output, EventEmitter,ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-nav-bar',
  imports:[CommonModule,RouterModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  encapsulation: ViewEncapsulation.None  // 🔥 Desactiva el aislamiento CSS

})
export class NavBar {
  @Output() searchClicked = new EventEmitter<void>();
  @Output() loginClicked = new EventEmitter<void>();


  onLoginClick() {
    this.loginClicked.emit();
  }
  onSearchClick(ev?: Event) {
    console.log('pressed');
    ev?.stopPropagation();          // ✅ keep this
    this.searchClicked.emit();
  }

}
