import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'bytesToSize'})
export class BytesToSizePipe implements PipeTransform {

  public transform(value: number|undefined, unit?: string): string {

    const units: string[] = [ 'B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB' ];

    if (!value) {
      return "0 B";
    }

    let result: number = value;
    let idx: number = 0;

    while (result > 1024 && idx < units.length - 1) {
      unit = units[idx];
      result /= 1024;
      idx ++;
    }
    return `${result} ${units[idx]}`
  }
}