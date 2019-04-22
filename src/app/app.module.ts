import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';


import { AppComponent } from './app.component';

import { HighchartsStatic } from 'angular2-highcharts/dist/HighchartsService';
import { NgSelectModule } from '@ng-select/ng-select';
import { FileDropModule } from 'ngx-file-drop';
import { PapaParseModule } from 'ngx-papaparse';

export declare let require: any;
export function highchartsFactory() {
  const hc = require('highcharts/highcharts');
  const dd = require('highcharts/modules/exporting');
  dd(hc);
  return hc;
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FileDropModule,
    ReactiveFormsModule,
    NgSelectModule,
    PapaParseModule
  ],
  providers: [
    {provide: HighchartsStatic, useFactory: highchartsFactory}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
