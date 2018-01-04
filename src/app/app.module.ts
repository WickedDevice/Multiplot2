import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';

import { Ng2FileDropModule }  from 'ng2-file-drop';
import { HighchartsStatic } from 'angular2-highcharts/dist/HighchartsService';
import { SelectModule } from 'angular2-select';

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
    Ng2FileDropModule,
    ReactiveFormsModule,
    SelectModule
  ],
  providers: [
    {provide: HighchartsStatic, useFactory: highchartsFactory}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
