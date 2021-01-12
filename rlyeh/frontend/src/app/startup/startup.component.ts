import { animate, style, transition, trigger } from '@angular/animations';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, interval } from 'rxjs';
import { take } from 'rxjs/operators';
import { BackendStateService, StatusReply } from '../services/backend-state.service';

@Component({
  selector: 'app-startup',
  templateUrl: './startup.component.html',
  styleUrls: ['./startup.component.scss'],
  animations: [
    trigger("fadeAnimation", [
      transition(":enter", [
        style({opacity: 0}),
        animate("2.5s", style({opacity: 1})),
        animate("2.5s", style({opacity: 0}))
      ])
    ]),
    trigger("fadeStartButton", [
      transition(":enter", [
        style({opacity: 0}),
        animate("2.5s", style({opacity: 1}))
      ])
    ])
  ]
})
export class StartupComponent implements OnInit, AfterViewInit {

  private _status_observer: BehaviorSubject<StatusReply>;
  private _current_state: string = "none";
  public shown_all_messages: boolean = false;
  public is_ready: boolean = false;

  public messages: string[] = [
    "Welcome to your storage appliance",
    "We are just finishing starting up.",
    "Please wait..."
  ];

  public cur_msg_idx: number = -1;

  public constructor(
    private _backend_state_svc: BackendStateService,
    private _router: Router
  ) {
    this._status_observer = this._backend_state_svc.getStatus();
  }

  public ngOnInit(): void {
    // this._router.navigate(["/dashboard"]);
    this._status_observer.subscribe({
      next: (status: StatusReply) => {
        const name: string = status.status.toLowerCase();
        if (name === "none") {
          return;
        }
        this.is_ready = true;
        this._current_state = name;
        console.log("current state: ", this._current_state);
      }
    })
  }

  public ngAfterViewInit(): void {
    interval(100).pipe(take(1)).subscribe(() => this.cur_msg_idx = 0);
    interval(5000).pipe(take(this.messages.length))
    .subscribe({
      next: (idx: number) => {
        this.cur_msg_idx = idx + 1;
        if (this.cur_msg_idx === this.messages.length - 1) {
          this.shown_all_messages = true;

          interval(2500).pipe(take(1)).subscribe( () => this._handleState());
        }
      }
    });
  }

  private _handleState(): void {
    const name: string = this._current_state;
    if (name === "choose_operation") {
      this._router.navigate(["/choose-operation"]);
    } else if (
      name.startsWith("bootstrap") || name.startsWith("auth") ||
      name.startsWith("inventory") || name.startsWith("provision") ||
      name.startsWith("service")
    ) {
      this._router.navigate(["/bootstrap"]);
    } else if (name === "ready") {
      this._router.navigate(["/dashboard"]);
    }
  }

}
