import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';

import * as parse from 'csv-parse';
import * as moment from 'moment';

declare var require: any;
var Highcharts = require('highcharts');
require('highcharts/modules/exporting')(Highcharts);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  @ViewChild('container') chartElement:ElementRef;
  fileContents = "";
  form: FormGroup;
  multiplePrimary: boolean = false;
  multipleSecondary: boolean = false;
  multipleFiles: boolean = true;
  optionsPrimary: Array<any> = [];
  optionsSecondary: Array<any> = [];
  optionsFiles: Array<any> = [];

  primarySelected;
  secondarySelected;
  excludedFiles = [];

  allDiscoveredHeaders: any = [];
  eggDataVectors: any = {};
  constructor(){

  }

  ngOnInit(){
    this.form = new FormGroup({});
    this.form.addControl('selectPrimary', new FormControl(''));
    this.form.addControl('selectSecondary', new FormControl(''));
    this.form.addControl('selectFiles', new FormControl(''));
  }

  dragFilesDropped($event){
    // console.log($event);
    let allPromises = [];
    $event.accepted.forEach((acceptedFile) => {

    let p =  new Promise( (resolve, reject) => {
        let fileReader = new FileReader();
        let filename = acceptedFile.file.name;
        fileReader.onload = () => {
            // console.log(fileReader.result);
            let content = fileReader.result.trim();
            parse(content, {auto_parse: true, relax_column_count: true}, (err, output) => {
              if(err){
                console.error(filename, err);
                reject();
                return;
              }

              this.fileContents += "\n\n" + filename + "\n" + content;
              // first row is a header generally speaking
              if(output && output.length){
                let headers = output[0].map(v => v.toLowerCase().replace(/percent/,'%'));
                let numFields = headers.length;
                output = output.slice(1);
                // first field must be a valid date
                output = output
                  .map(r => {
                    let m = moment(r[0], "MM/DD/YYYY HH:mm:ss")
                    if(!m.isValid()){
                      r[0] = null;
                    }
                    else{
                      r[0] = m.unix() * 1000 + moment().utcOffset()*60*1000;
                    }
                    return r;
                  })
                  .filter(r => r[0] && (r.length === headers.length));

                // console.log(filename, headers, output);

                // collect all headers
                headers.forEach((header, index) => {
                  if(this.allDiscoveredHeaders.indexOf(header) < 0){
                    this.allDiscoveredHeaders.push(header);
                  }

                  // create a data vector in this egg, for this header
                  if(index > 0){ // don't do it for the timestamp column
                    if(!this.eggDataVectors[filename]) this.eggDataVectors[filename] = {};
                    this.eggDataVectors[filename][header] = output
                      .map(r => {
                        let timestamp = r[0]; // convert to unix timestamp
                        let value = r[index];
                        return [timestamp, value];
                      })
                      .filter(r => this.isNumeric(r[1]));
                  }
                });

                console.log(`promised completed for ${filename}`);
                resolve();
              }
              else{
                console.error(`no output for ${filename}`);
                reject();
              }
            });
        };
        fileReader.readAsText(acceptedFile.file);
      });

      allPromises.push(p);
    });

    console.log(`Waiting for completion of ${allPromises.length} promises`);
    Promise.all(allPromises)
    .then(() => {
      console.log(this.allDiscoveredHeaders);

      this.optionsPrimary = this.allDiscoveredHeaders.map(h => {
        return {
          value: h,
          label: h
        }
      })
      .filter(o => ['timestamp'].indexOf(o.label) < 0);

      this.optionsSecondary = this.allDiscoveredHeaders.map(h => {
        return {
          value: h,
          label: h
        }
      })
      .filter(o => ['timestamp'].indexOf(o.label) < 0);

      this.optionsFiles = Object.keys(this.eggDataVectors).map(f => {
        return {
          value: f,
          label: f
        }
      });
    })
    .catch((err) => {
      console.error(err);
    })
  }

  isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  onPrimaryOpened(){
    console.log('onPrimaryOpened');
  }
  onPrimaryClosed(){
    console.log('onPrimaryClosed');
  }
  onPrimarySelected($event){
    console.log('onPrimarySelected', $event);
    this.primarySelected = $event.value;
    this.redrawChart();
  }
  onPrimaryDeselected($event){
    console.log('onPrimaryDeselected', $event);
    this.primarySelected = null;
    this.redrawChart();
  }

  onSecondaryOpened(){
    console.log('onSecondaryOpened');
  }
  onSecondaryClosed(){
    console.log('onSecondaryClosed');
  }
  onSecondarySelected($event){
    console.log('onSecondarySelected', $event);
    this.secondarySelected = $event.value;
    this.redrawChart();
  }
  onSecondaryDeselected($event){
    console.log('onSecondaryDeselected', $event);
    this.secondarySelected = null;
    this.redrawChart();
  }

  onFilesOpened(){
    console.log('onFilesOpened');
  }
  onFilesClosed(){
    console.log('onFilesClosed');
  }
  onFilesSelected($event){
    console.log('onFilesSelected', $event);
    this.excludedFiles = this.form.value.selectFiles.slice(0);
    this.redrawChart();
  }
  onFilesDeselected($event){
    console.log('onFilesDeselected', $event);
    this.excludedFiles = this.form.value.selectFiles.slice(0);
    this.redrawChart();
  }

  redrawChart(){
    let chartOptions = {
      chart: {
          type: 'spline',
          zoomType: 'xy',
          panning: true,
          panKey: 'shift'
      },
      title: {
          text: ''
      },
      // subtitle: {
      //     text: 'Irregular time data in Highcharts JS'
      // },
      xAxis: {
          type: 'datetime',
          dateTimeLabelFormats: {
            millisecond:"%A, %b %e, %H:%M:%S",
            second:"%A, %b %e, %H:%M:%S",
            minute:"%A, %b %e, %H:%M",
            hour:"%A, %b %e, %H:%M",
            day:"%A, %b %e, %Y",
            week:"Week from %A, %b %e, %Y",
            month:"%B %Y",
            year:"%Y"
          },
          title: {
              text: 'Date'
          }
      },
      yAxis: [{
          title: {
              text: this.primarySelected
          }
      }],
      tooltip: {
          headerFormat: '<b>{series.name}</b><br>',
          pointFormat: '{point.x:%A, %b %e, %H:%M:%S}: {point.y:.2f} '
      },

      plotOptions: {
          spline: {
              marker: {
                  enabled: true
              }
          },
          series: {
            events: {
              legendItemClick: function () {
                  return false;
              }
            }
          }
      },

      series: []
    };

    let title:any = [this.primarySelected];
    title.push(this.secondarySelected);
    title = title.filter(v => v && v.trim());
    chartOptions.title.text = title.join(' and ').toString();

    let header = this.primarySelected;
    Object.keys(this.eggDataVectors).forEach(filename => {
      if(this.excludedFiles.indexOf(filename) >= 0) return;

      if(this.eggDataVectors[filename][header]){
        chartOptions.series.push({
          name: `${filename.split('.csv')[0]}-${header}`,
          data: this.eggDataVectors[filename][header]
        })
      }
    });

    if(this.secondarySelected){
      chartOptions.yAxis.push(<any> {
        title: {
            text: this.secondarySelected
        },
        opposite: true
      });

    header = this.secondarySelected;
     Object.keys(this.eggDataVectors).forEach(filename => {
       if(this.excludedFiles.indexOf(filename) >= 0) return;

       if(this.eggDataVectors[filename][header]){
         chartOptions.series.push({
           name: `${filename.split('.csv')[0]}-${header}`,
           data: this.eggDataVectors[filename][header],
           yAxis: 1
         })
       }
     });

    }

    Highcharts.chart(this.chartElement.nativeElement, chartOptions);
  }
}
