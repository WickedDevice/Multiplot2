import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';

import * as parse from 'csv-parse';
import * as moment from 'moment';

declare var require: any;
const Highcharts = require('highcharts');
require('highcharts/modules/exporting')(Highcharts);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('container') chartElement: ElementRef;
  fileContents = '';
  form: FormGroup;
  multiplePrimary = true;
  multipleSecondary = true;
  multipleFiles = true;
  optionsPrimary: Array<any> = [];
  optionsSecondary: Array<any> = [];
  optionsFiles: Array<any> = [];

  primarySelected;
  secondarySelected;
  excludedFiles = [];

  allDiscoveredHeaders: any = [];
  eggDataVectors: any = {};
  constructor() {

  }

  ngOnInit() {
    this.form = new FormGroup({});
    this.form.addControl('selectPrimary', new FormControl(''));
    this.form.addControl('selectSecondary', new FormControl(''));
    this.form.addControl('selectFiles', new FormControl(''));
  }

  dragFilesDropped($event) {
    // console.log($event);
    const allPromises = [];
    $event.accepted.forEach((acceptedFile) => {

    const p =  new Promise( (resolve, reject) => {
        const fileReader = new FileReader();
        const filename = acceptedFile.file.name;
        fileReader.onload = () => {
            // console.log(fileReader.result);
            const content = fileReader.result.trim();
            parse(content, {auto_parse: true, relax_column_count: true}, (err, output) => {
              if (err) {
                console.error(filename, err);
                reject();
                return;
              }

              this.fileContents += '\n\n' + filename + '\n' + content;
              // first row is a header generally speaking
              if (output && output.length) {
                const headers = output[0].map(v => v.toLowerCase().replace(/percent/, '%'));
                const numFields = headers.length;
                output = output.slice(1);
                // first field must be a valid date
                output = output
                  .map(r => {
                    // first check if it parses as a normal ISO8601 formatted string
                    let m = moment(r[0], 'YYYY-MM-DDTHH:mm:ssZ');
                    if (!m.isValid()) {
                      m = moment(r[0], 'MM/DD/YYYY HH:mm:ss');
                    }
                    if (!m.isValid()) {
                      r[0] = null;
                    } else {
                      r[0] = m.unix() * 1000 + moment().utcOffset() * 60 * 1000;
                    }
                    return r;
                  })
                  .filter(r => r[0] && (r.length === headers.length));

                // console.log(filename, headers, output);

                // collect all headers
                headers.forEach((header, index) => {
                  if (this.allDiscoveredHeaders.indexOf(header) < 0) {
                    this.allDiscoveredHeaders.push(header);
                  }

                  // create a data vector in this egg, for this header
                  if (index > 0) { // don't do it for the timestamp column
                    if (!this.eggDataVectors[filename]) { this.eggDataVectors[filename] = {}; }
                    this.eggDataVectors[filename][header] = output
                      .map(r => {
                        const timestamp = r[0]; // convert to unix timestamp
                        const value = r[index];
                        return [timestamp, value];
                      })
                      .filter(r => this.isNumeric(r[1]));
                  }
                });

                console.log(`promised completed for ${filename}`);
                resolve();
              } else {
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
        };
      })
      .filter(o => ['timestamp'].indexOf(o.label) < 0);

      this.optionsSecondary = this.allDiscoveredHeaders.map(h => {
        return {
          value: h,
          label: h
        };
      })
      .filter(o => ['timestamp'].indexOf(o.label) < 0);

      this.optionsFiles = Object.keys(this.eggDataVectors).map(f => {
        return {
          value: f,
          label: f
        };
      });
    })
    .catch((err) => {
      console.error(err);
    });
  }

  isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  onPrimaryOpened() {
    console.log('onPrimaryOpened');
  }
  onPrimaryClosed() {
    console.log('onPrimaryClosed');
  }
  onPrimarySelected($event) {
    console.log('onPrimarySelected', $event);
    // this.primarySelected = $event.value;
    this.primarySelected = this.form.value.selectPrimary.slice(0);
    this.redrawChart();
  }
  onPrimaryDeselected($event) {
    console.log('onPrimaryDeselected', $event);
    // this.primarySelected = null;
    this.primarySelected = this.form.value.selectPrimary.slice(0);
    this.redrawChart();
  }

  onSecondaryOpened() {
    console.log('onSecondaryOpened');
  }
  onSecondaryClosed() {
    console.log('onSecondaryClosed');
  }
  onSecondarySelected($event) {
    console.log('onSecondarySelected', $event);
    // this.secondarySelected = $event.value;
    this.secondarySelected = this.form.value.selectSecondary.slice(0);
    this.redrawChart();
  }
  onSecondaryDeselected($event) {
    console.log('onSecondaryDeselected', $event);
    // this.secondarySelected = null;
    this.secondarySelected = this.form.value.selectSecondary.slice(0);
    this.redrawChart();
  }

  onFilesOpened() {
    console.log('onFilesOpened');
  }
  onFilesClosed() {
    console.log('onFilesClosed');
  }
  onFilesSelected($event) {
    console.log('onFilesSelected', $event);
    this.excludedFiles = this.form.value.selectFiles.slice(0);
    this.redrawChart();
  }
  onFilesDeselected($event) {
    console.log('onFilesDeselected', $event);
    this.excludedFiles = this.form.value.selectFiles.slice(0);
    this.redrawChart();
  }

  redrawChart() {
    let digits = 2;
    ['v', 'volt', 'volts'].forEach(unit => {
      if (this.primarySelected
        && this.primarySelected.find(v => v.toLowerCase().indexOf(unit) >= 0)) {
        digits = 6;
      } else if (this.secondarySelected
        && this.secondarySelected.find(v => v.toLowerCase().indexOf(unit) >= 0)) {
        digits = 6;
      }
    });

    const chartOptions = {
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
            millisecond: '%A, %b %e, %H:%M:%S',
            second: '%A, %b %e, %H:%M:%S',
            minute: '%A, %b %e, %H:%M',
            hour: '%A, %b %e, %H:%M',
            day: '%A, %b %e, %Y',
            week: 'Week from %A, %b %e, %Y',
            month: '%B %Y',
            year: '%Y'
          },
          title: {
              text: 'Date'
          }
      },
      yAxis: [{
          title: {
              text: this.primarySelected ? this.primarySelected.join(',') : ''
          }
      }],
      tooltip: {
          headerFormat: '<b>{series.name}</b><br>',
          pointFormat: `{point.x:%A, %b %e, %H:%M:%S}: {point.y:.${digits}f} `
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

    let title: any = [this.primarySelected ? this.primarySelected.join(',') : null];
    title.push(this.secondarySelected ? this.secondarySelected.join(',') : null);
    title = title.filter(v => v && v.trim());
    chartOptions.title.text = title.join(' and ').toString();

    if (this.primarySelected && (this.primarySelected.length > 0)) {
      this.primarySelected.forEach((primarySelected) => {
        const header = primarySelected;
        Object.keys(this.eggDataVectors).forEach(filename => {
          if (this.excludedFiles.indexOf(filename) >= 0) { return; }

          if (this.eggDataVectors[filename][header]) {
            chartOptions.series.push({
              name: `${filename.split('.csv')[0]}-${header}`,
              data: this.eggDataVectors[filename][header]
            });
          }
        });
      });
    }

    if (this.secondarySelected && (this.secondarySelected.length > 0)) {
      chartOptions.yAxis.push(<any> {
        title: {
            text: this.secondarySelected.join(',')
        },
        opposite: true
      });

      this.secondarySelected.forEach((secondarySelected) => {
        const header = secondarySelected;
        Object.keys(this.eggDataVectors).forEach(filename => {
         if (this.excludedFiles.indexOf(filename) >= 0) { return; }

         if (this.eggDataVectors[filename][header]) {
           chartOptions.series.push({
             name: `${filename.split('.csv')[0]}-${header}`,
             data: this.eggDataVectors[filename][header],
             yAxis: 1
           });
         }
        });
      });

    }

    Highcharts.chart(this.chartElement.nativeElement, chartOptions);
  }
}
