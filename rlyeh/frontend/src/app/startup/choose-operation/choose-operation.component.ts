import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-choose-operation',
  templateUrl: './choose-operation.component.html',
  styleUrls: ['./choose-operation.component.scss']
})
export class ChooseOperationComponent implements OnInit {

  public is_bootstrap_waiting: boolean = false;

  public constructor(
    private _http: HttpClient,
    private _router: Router
  ) { }

  public ngOnInit(): void { }


  public chooseBootstrap(): void {

    if (this.is_bootstrap_waiting) {
      return;
    }

    this.is_bootstrap_waiting = true;
    this._http.post("/api/bootstrap", {}).subscribe({
      next: () => {
        this._router.navigate(["/bootstrap"]);
      },
      error: (err) => {
        this.is_bootstrap_waiting = false;
        console.error("error bootstrapping: ", err);
      }
    });

  }
}
