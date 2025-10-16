import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-panel-admin',
  imports: [CommonModule,RouterModule,HttpClientModule],
  templateUrl: './panel-admin.html',
  styleUrls: ['./panel-admin.css'],
  standalone: true,

})
export class PanelAdmin {

}
