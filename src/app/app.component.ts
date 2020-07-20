import { Component, ElementRef, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { UploadEvent, UploadFile, FileSystemFileEntry, FileSystemDirectoryEntry } from 'ngx-file-drop';

// import 'setimmediate';
import { Papa } from 'ngx-papaparse';
import * as moment from 'moment';

declare var require: any;
const Highcharts = require('highcharts');
require('highcharts/modules/exporting')(Highcharts);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
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

  chartTypeSelected = 'line';
  xSelected;
  primarySelected;
  secondarySelected;
  excludedFiles = [];

  allDiscoveredHeaders: any = [];
  eggDataVectors: any = {};
  constructor(private papa: Papa, private cdr: ChangeDetectorRef) {

    // example from https://www.youtube.com/watch?v=83x0gtaJgq0
    // const {a, b} = this.calculateExponentialModelParameters([0,1,3,5,7,9], [1, .891, .708, .562, .447, .355]);
    // console.log(a, b);
  }

  ngOnInit() {
    this.form = new FormGroup({});
    this.form.addControl('selectChartType', new FormControl('line'));

    const xForm = new FormControl('');
    xForm.setValue(null);
    this.form.addControl('selectX', xForm);
    this.form.addControl('selectPrimary', new FormControl(''));
    this.form.addControl('selectSecondary', new FormControl(''));
    this.form.addControl('selectFiles', new FormControl(''));
  }

  dragFilesDropped($event) {
    // console.log($event);
    const allPromises = [];
    $event.files.forEach((acceptedFile) => {

    const p =  new Promise( (resolve, reject) => {
        const fileReader = new FileReader();
        const filename = acceptedFile.relativePath;
        fileReader.onload = () => {
            // console.log(fileReader.result);
            const content = (<any> fileReader.result).trim();
            this.papa.parse(content, {
              dynamicTyping: true,
              header: false,
              error: (err, file) => {
                console.error(filename, err);
                reject();
              },
              complete: (result) => {
                let output = result.data;
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
                      let m = moment(r[0], 'YYYY-MM-DDTHH:mm:ssZ', true);
                      if (!m.isValid()) {
                        m = moment(r[0], 'MM/DD/YYYY HH:mm:ss', true);
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
              }
            });

        };

        acceptedFile.fileEntry.file((file) => {
          fileReader.readAsText(file);
        }, (err) => {
          reject(err);
        });

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


  onXOpened() {
    console.log('onXOpened');
  }
  onXClosed() {
    console.log('onXClosed');
  }
  onXSelected($event) {
    console.log('onXSelected', $event);
    // this.primarySelected = $event.value;
    // this.primarySelected = this.form.value.selectPrimary.slice(0);
    if ($event && $event.value) {
      this.xSelected = $event.value;
    } else {
      this.xSelected = '';
    }

    this.cdr.detectChanges();

    this.redrawChart();
  }


  onChartTypeOpened() {
    console.log('onChartTypeOpened');
  }
  onChartTypeClosed() {
    console.log('onChartTypeClosed');
  }
  onChartTypeSelected($event) {
    console.log('onChartTypeSelected', $event);
    // this.primarySelected = $event.value;
    // this.primarySelected = this.form.value.selectPrimary.slice(0);
    this.chartTypeSelected = $event;
    this.redrawChart();
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
    // this.primarySelected = this.form.value.selectPrimary.slice(0);
    this.primarySelected = $event.slice().map(v => v.value);
    this.redrawChart();
  }
  onPrimaryDeselected($event) {
    console.log('onPrimaryDeselected', $event);
    // this.primarySelected = null;
    // this.primarySelected = this.form.value.selectPrimary.slice(0);
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
    // this.secondarySelected = this.form.value.selectSecondary.slice(0);
    this.secondarySelected = $event.slice().map(v => v.value);
    this.redrawChart();
  }
  onSecondaryDeselected($event) {
    console.log('onSecondaryDeselected', $event);
    // this.secondarySelected = null;
    // this.secondarySelected = this.form.value.selectSecondary.slice(0);
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
    // this.excludedFiles = this.form.value.selectFiles.slice(0);
    this.excludedFiles = $event.slice().map(v => v.value);
    this.redrawChart();
  }
  onFilesDeselected($event) {
    console.log('onFilesDeselected', $event);
    // this.excludedFiles = this.form.value.selectFiles.slice(0);
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

    let chartType;
    switch(this.chartTypeSelected) {
      case 'scatter':
        chartType = 'scatter';
        break;
      default:
        chartType = 'spline';
        break;
    }

    const chartOptions: any = {
      chart: {
          type: chartType,
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

    if (this.chartTypeSelected === 'scatter') {
      chartOptions.xAxis =  {
        title: {
            enabled: true,
            text: this.xSelected
        },
        startOnTick: true,
        endOnTick: true,
        showLastLabel: true
      };

      delete chartOptions.plotOptions.spline;
      chartOptions.plotOptions.scatter = {
        marker: {
          radius: 5,
          states: {
            hover: {
              enabled: true,
              lineColor: 'rgb(100,100,100)'
            }
          }
        },
        states: {
          hover: {
            marker: {
              enabled: false
            }
          }
        },
        tooltip: {
          headerFormat: '<b>{series.name}</b><br>',
          pointFormat: '{point.x}, {point.y}'
        }
      };
    }

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

            let data = this.eggDataVectors[filename][header];
            if (this.chartTypeSelected === 'scatter') {
              const xVector = this.eggDataVectors[filename][this.xSelected];
              if (xVector) {
                data = data.map((v, idx) => {
                  return [
                    xVector[idx][1],
                    v[1]
                  ];
                });
              }

              try {
                const {a, b} = this.calculateExponentialModelParameters(data.map(v => v[0]), data.map(v => v[1]));
                console.log(a, b);
              } catch (e) {
                console.error(e);
              }

            }

            chartOptions.series.push({
              name: `${filename.split('.csv')[0]}-${header}`,
              data
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

          let data = this.eggDataVectors[filename][header];
          if (this.chartTypeSelected === 'scatter') {
            const xVector = this.eggDataVectors[filename][this.xSelected];
            if (xVector) {
              data = data.map((v, idx) => {
                return [
                  xVector[idx][1],
                  v[1]
                ];
              });
            }

            try {
              const {a, b} = this.calculateExponentialModelParameters(data.map(v => v[0]), data.map(v => v[1]));
              console.log(a, b);
            } catch (e) {
              console.error(e);
            }

          }

           chartOptions.series.push({
             name: `${filename.split('.csv')[0]}-${header}`,
             data,
             yAxis: 1
           });
         }
        });
      });

    }

    Highcharts.chart(this.chartElement.nativeElement, chartOptions);
  }

  // least squares fit to exponential model y = a * exp(bx)
  // given set of (x_i, y_i)...
  // first apply transform to data into z
  // note: z = ln(y0) = a0 + a1*x; where a0 = ln(a) and a1 = b; (a,b) from above
  // then calculate average value of z_i ... =  z_bar
  // and caclculate average value of x_i ... = x_bar
  // a0 and a1 can be calculated using standard linear regression formula
  //
  // a1 = n*SUM(xi * zi) - SUM(xi)*SUM(zi)
  //      --------------------------------
  //          n*SUM(xi^2) - (SUM(xi))^2
  //
  // a0 = z_bar - a1 * x_bar
  //
  // so calculate (for use in a1 evaluation):
  //    SUM(xi * zi)
  //    SUM(xi)
  //    SUM(zi)
  //    SUM(xi^2)
  //
  // finally, calculate (a, b) from (a0, a1)
  // a = exp(a0)
  // b = a1

  sum(vector) {
    const sum = vector.reduce((t, v) => t + (+v), 0);
    return sum;
  }
  average(vector) {
    const sum = this.sum(vector);
    const n = vector.length;
    return 1.0 * sum / n;
  }
  min(vector) {
    const min = vector.reduce((t, v) => v < t ? v : t, Number.MAX_VALUE);
    return min;
  }

  calculateExponentialModelParameters(x_vector, y_vector) {
    // const min = this.min(x_vector);
    // x_vector = x_vector.map(v => v - min);
    const n = x_vector.length;
    const x_bar = this.average(x_vector);
    const z_vector = y_vector.map(v => Math.log(+v));
    const z_bar = this.average(z_vector);
    const xz_vector = x_vector.map((v, idx) => v * z_vector[idx]);
    const sum_xz = this.sum(xz_vector);
    const sum_x = this.sum(x_vector);
    const sum_z = this.sum(z_vector);
    const xsquared_vector = x_vector.map(v => v * v);
    const sum_xsquared = this.sum(xsquared_vector);

    const a1 = ((n * sum_xz)       - (sum_x * sum_z)) /
               ((n * sum_xsquared) - (sum_x * sum_x));

    const a0 = z_bar - a1 * x_bar;

    const a = Math.exp(a0);
    const b = a1;

    return {a, b};
  }

}
