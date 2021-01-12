import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { take } from 'rxjs/operators';

interface PoolStatsItem {
  used: number;
  percent_used: number;
  avail: number;
  avail_raw: number;
}

interface StatsItem {
  total_avail_bytes: number;
  total_raw_bytes: number;
  total_used_raw_bytes: number;
  pools: {[id: string]: PoolStatsItem};
}

interface UsageItem {
  name: string;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  public usage_data: UsageItem[] = [];
  public nfs_exports: string[] = [];
  public total_bytes_raw: number = 0;
  public total_bytes: number = 0;


  public constructor(
    private _http: HttpClient
  ) {}

  public ngOnInit(): void {

    this._obtainStats();

  }

  private _obtainStats(): void {

    this._http.get<StatsItem>("/api/df").subscribe({
      next: (stats: StatsItem) => {
        this._handleStats(stats);
      }
    });
    interval(5000).pipe(take(1)).subscribe(this._obtainStats.bind(this));
  }

  private _handleStats(stats: StatsItem): void {    
    this.nfs_exports = Object.keys(stats.pools);

    const usage: UsageItem[] = [];
    let avail: number = stats.total_avail_bytes;
    this.nfs_exports.forEach( (_name: string) => {
      const poolstats: PoolStatsItem = stats.pools[_name];
      if (avail < poolstats.avail) {
        avail = poolstats.avail;
      }
      usage.push({ name: _name, value: poolstats.used });
    });
    usage.push({name: "Available", value: avail});
    this.usage_data = [...usage];
  }
}
