import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { take } from 'rxjs/operators';

interface BootstrapDashboardReply {
  host: string;
  port: number;
  user: string;
  password: string;
}

interface BootstrapResult {
  fsid: string;
  config_path: string;
  keyring_path: string;
  dashboard?: BootstrapDashboardReply;
}

interface InventoryDevice {
  available: boolean;
  path: string;
  human_readable_type: string;
  device_id: string;
  sys_api: {
    size: number;
  }
}

interface InventoryReply {
  name: string;
  addr: string;
  devices: InventoryDevice[];
}

interface StatusReply {
  status: string;
  result?: BootstrapResult;
}


interface State {
  label: string;
  start: boolean;
  wait?: boolean;
  end: boolean;
  error: boolean;
}


@Component({
  selector: 'app-bootstrap',
  templateUrl: './bootstrap.component.html',
  styleUrls: ['./bootstrap.component.scss']
})
export class BootstrapComponent implements OnInit {

  public statelst: string[] = [ "bootstrap", "auth", "inventory" ];
  public states: {[id: string]: State} = {
    bootstrap: {label: "Bootstrap", start: false, end: false, error: false},
    auth: {label: "Authentication", start: false, end: false, error: false},
    inventory: {label: "Inventory", start: false, end: false, error: false}
  };
  public current_state_idx: number = 0;
  public obtaining_inventory: boolean = false;
  public obtained_inventory: boolean = false;
  public inventory_devices: InventoryDevice[] = [];

  public constructor(
    private _http: HttpClient,
  ) { }

  public ngOnInit(): void {
    this._obtainStatus();
  }

  private _obtainStatus(): void {
    this._http.get<StatusReply>("/api/status")
    .subscribe(this._handleStatus.bind(this));
    interval(5000).pipe(take(1)).subscribe(this._obtainStatus.bind(this));
  }


  private _markStageStage(state: State, stage: string): void {
    if (stage === "start") {
      state.start = true;
    } else if (stage === "end") {
      state.end = true;
    } else if (stage === "error") {
      state.error = true;
    } else if (stage === "wait") {
      state.wait = true;
    } else {
      throw new Error("unknown stage: " + stage);
    }
  }

  private _markState(name: string, stage: string|string[]): void {
    if (!(name in this.states)) {
      throw new Error("unknown state: " + name);
    }

    if (typeof stage === "string") {
      this._markStageStage(this.states[name], stage);
    } else {
      const lst: string[] = (stage as string[]);
      lst.forEach( (s: string) => {
        this._markStageStage(this.states[name], s);
      });
    }
  }

  private _statusOn(state: string): void {

    if (state.startsWith("bootstrap")) {
      this._markState("bootstrap", "start");
      if (state === "bootstrap_end") {
        this._markState("bootstrap", "end");
      } else if (state === "bootstrap_error") {
        this._markState("bootstrap", "error");
      }
    } else if (state.startsWith("auth")) {
      this._markState("bootstrap", ["start", "end"]);
      this._markState("auth", "start");
      if (state === "auth_end") {
        this._markState("auth", "end");
      } else if (state === "auth_error") {
        this._markState("auth", "error");
      }
    } else if (state.startsWith("inventory")) {
      this._markState("bootstrap", ["start", "end"]);
      this._markState("auth", ["start", "end"]);
      this._markState("inventory", "start");
      if (state === "inventory_wait") {
        this._markState("inventory", "wait");
      }
    } else if (state === "NONE") {
      console.log("no state yet");      
    } else {
      throw new Error("unknown state: " + state);
    }

    let i: number = 0;
    let has_error: number = -1;
    this.statelst.forEach( (name: string) => {
      if (has_error >= 0) {
        return;
      } else if (this.states[name].error) {
        has_error = i;
        return;
      } else if (this.states[name].end) {
        i += 1;
        return;
      }
    });
    console.log("current state: ", i);
    this.current_state_idx = i;
  }

  private _handleInventory(inventory: InventoryReply): void {
    console.log("host: ", inventory.name, " addr: ", inventory.addr);
    inventory.devices.forEach( (dev: InventoryDevice) => {
      console.log(" > dev: ", dev.path, " size: ", dev.sys_api.size);
    });
    this.inventory_devices = [...inventory.devices];
  }

  private _obtainInventory(): void {
    this.obtaining_inventory = true;
    this._http.get<InventoryReply>("/api/inventory").subscribe({
      next: (res: InventoryReply) => {
        console.log(res);
        this.obtained_inventory = true;
        this._handleInventory(res);
      },
      error: (err) => {
        console.error("error obtaining inventory: ", err);
        this.obtaining_inventory = false;
      }
    });
  }

  private _handleStatus(reply: StatusReply): void {

    const status: string = reply.status.toLowerCase();
    this._statusOn(status);

    if (!!this.states.inventory.wait && this.states.inventory.wait &&
        !this.obtaining_inventory && !this.obtained_inventory) {

      this._obtainInventory();
    }
  }

}
