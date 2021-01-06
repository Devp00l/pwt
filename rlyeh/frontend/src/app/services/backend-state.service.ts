import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
import { take } from 'rxjs/operators';


export interface StatusReply {
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class BackendStateService {

  private _status_subject: BehaviorSubject<StatusReply> =
    new BehaviorSubject<StatusReply>({status: "none"});

  public constructor(
    private _http: HttpClient
  ) {
    this._obtainStatus();
  }

  private _obtainStatus(): void {
    this._http.get<StatusReply>("/api/status").subscribe({
      next: (status: StatusReply) => {
        this._status_subject.next(status);
      }
    });
    interval(5000).pipe(take(1)).subscribe(this._obtainStatus.bind(this));
  }

  public getStatus(): BehaviorSubject<StatusReply> {
    return this._status_subject;
  }
}
