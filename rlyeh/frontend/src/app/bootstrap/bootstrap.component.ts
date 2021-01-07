import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { take } from 'rxjs/operators';
import { MatSelectChange } from '@angular/material/select';

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
  type: string;
  size: number;
}

interface InventorySolution {
  can_raid0: boolean;
  can_raid1: boolean;
  raid0_size: number;
  raid1_size: number;
}

interface InventoryReply {
  solution: InventorySolution;
  devices: InventoryDevice[];
}

interface StatusReply {
  status: string;
  result?: BootstrapResult;
}

interface SolutionItem {
  name: string;
  label: string;
  available: boolean;
  size: number;
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

  public statelst: string[] = [
    "bootstrap", "auth", "inventory", "provision", "service", "done"
  ];
  public states: {[id: string]: State} = {
    bootstrap: {label: "Bootstrap", start: false, end: false, error: false},
    auth: {label: "Authentication", start: false, end: false, error: false},
    inventory: {label: "Inventory", start: false, end: false, error: false},
    provision: {label: "Provisioning", start: false, end: false, error: false},
    service: {label: "Services", start: false, end: false, error: false},
    done: {label: "Done", start: false, end: false, error: false },
  };
  public current_state_idx: number = 0;
  public obtaining_inventory: boolean = false;
  public obtained_inventory: boolean = false;
  public inventory_devices: InventoryDevice[] = [];
  public available_raw_size: number = 0;
  public solutions: {[id: string]: SolutionItem} = {};
  public selected_solution: SolutionItem|undefined = undefined;
  public has_selected_solution: boolean = false;
  public submitting_solution: boolean = false;
  public is_bootstrapping: boolean = false;
  public is_waiting_user: boolean = false;

  public nfs_exports: string[] = [];
  public is_confirming_services: boolean = false;
  public is_services_confirmed: boolean = false;
  public is_creating_services: boolean = false;
  public is_services_done: boolean = false;


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

    console.log("> state name: ", state);

    if (state === "none") {
    
    } else if (state.startsWith("bootstrap")) {
      
      if (state === "bootstrap_start") {
        this._markState("bootstrap", "start");
      } else if (state === "bootstrap_end") {
        this._markState("bootstrap", "end");
      } else if (state === "bootstrap_error") {
        this._markState("bootstrap", "error");
      } else if (state === "bootstrap_wait") {
        this._markState("bootstrap", "wait");
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
        this.is_waiting_user = true;
      } else {
        this.is_waiting_user = false;
      }

    } else if (state.startsWith("provision")) {
      this._markState("bootstrap", ["start", "end"]);
      this._markState("auth", ["start", "end"]);
      this._markState("inventory", ["start", "end"]);
      this._markState("provision", "start");

      if (state === "provision_end") {
        this._markState("provision", "end");
      }

    } else if (state.startsWith("service")) {
      this._markState("bootstrap", ["start", "end"]);
      this._markState("auth", ["start", "end"]);
      this._markState("inventory", ["start", "end"]);
      this._markState("provision", ["start", "end"]);

      this.is_waiting_user = (state === "service_wait");
      if (state === "service_start") {
        this._markState("service", "start");
      } else if (state === "service_end") {
        this._markState("service", ["start", "end"]);
        this.is_services_done = true;
      }

    } else {
      throw new Error("unknown state: " + state);
    }

    let i: number = 0;
    let found: boolean = false;
    let has_error: number = -1;
    this.statelst.forEach( (name: string) => {
      if (has_error >= 0 || found) {
        return;
      } else if (this.states[name].error) {
        has_error = i;
        return;
      } else if (!this.states[name].end ||
                 i === this.statelst.length - 1) {
        found = true;
        return;
      } else {
        i++;
      }
    });
    console.log("current state: ", i);
    this.current_state_idx = i;
  }

  private _handleInventory(inventory: InventoryReply): void {
    inventory.devices.forEach( (dev: InventoryDevice) => {
      console.log(" > dev: ", dev.path, " size: ", dev.size);
    });
    this.inventory_devices = [...inventory.devices];
    this.inventory_devices.forEach( (dev: InventoryDevice) => {
      if (dev.available) {
        this.available_raw_size += dev.size;
      }
    });
    this.solutions = {
      raid0: {
        name: "raid0",
        label: "RAID 0",
        available: inventory.solution.can_raid0,
        size: inventory.solution.raid0_size
      },
      raid1: {
        name: "raid1",
        label: "RAID 1",
        available: inventory.solution.can_raid1,
        size: inventory.solution.raid1_size
      }
    };
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

  public startBootstrap(): void {
    console.log("start bootstrap");
    this.is_bootstrapping = true;

    this._http.post("/api/bootstrap", {}).subscribe({
      next: () => { console.log("bootstrapping"); },
      error: (err) => { console.error("error bootstrapping: ", err); }
    });
  }

  public selectedSolution(event: MatSelectChange): void {
    console.log("> ", event);
    if (!event || !event.value || event.value === "") {
      return;
    }
    const selected: string = event.value;

    if (!(selected in this.solutions)) {
      this.has_selected_solution = false;
      return;
    }

    this.has_selected_solution = true;
    this.selected_solution = this.solutions[selected];
  }

  public acceptSolution(): void {
    if (!this.has_selected_solution) {
      return;
    } else if (!this.selected_solution) {
      throw new Error("expected to have a selected solution");
    }

    this.submitting_solution = true;

    const reply = { name: this.selected_solution.name };
    this._http.post("/api/solution/accept", reply)
    .subscribe({
      next: (res) => {
        console.log("solution accept result: ", res);
      },
      error: (err) => console.log("solution accept error: ", err)
    });

    // accept solution
  }

  public isNFSValidName(name: string): boolean {
    const actual: string = name.trim();
    if (actual === "" || this.nfs_exports.includes(actual)) {
      return false;
    }
    return true;
  }

  public addNFSExport(name: string): void {
    const actual: string = name.trim();
    if (!this.isNFSValidName(actual)) {
      return;
    }
    this.nfs_exports.push(actual);
  }

  public removeNFSExport(name: string): void {
    const actual: string = name.trim();
    if (!this.nfs_exports.includes(actual)) {
      return;
    }
    const idx: number = this.nfs_exports.indexOf(actual);
    this.nfs_exports.splice(idx, 1);
  }

  public confirmServices(): void {
    this.is_confirming_services = true;
    const svc_desc = { nfs_name: this.nfs_exports };
    this._http.post("/api/services/setup", svc_desc).subscribe({
      next: (res) => {
        this.is_services_confirmed = true;
      },
      error: (err) => {
        console.error("error setting up services: ", err);
      },
      complete: () => {
        this.is_confirming_services = false;
      }
    });

  }
}
