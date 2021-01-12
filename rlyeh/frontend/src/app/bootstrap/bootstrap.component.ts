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
  desc?: string;
}


@Component({
  selector: 'app-bootstrap',
  templateUrl: './bootstrap.component.html',
  styleUrls: ['./bootstrap.component.scss']
})
export class BootstrapComponent implements OnInit {

  public statelst: string[] = [
    "bootstrap", "inventory", "provision", "service", "ready"
  ];
  public states: {[id: string]: State} = {
    bootstrap: {
      label: "Bootstrap", desc: "Starting minimal deployment"
    },
    inventory: {
      label: "Inventory", desc: "Assessing system's storage devices"
    },
    provision: {
      label: "Provisioning", desc: "Configuring and starting storage devices"
    },
    service: {
      label: "Storage Access", desc: "Configuring how to access the storage"
    },
    ready: { label: "Ready" },
  };
  public current_step: number = -1;

  // bootstrap
  public is_bootstrapping: boolean = false;
  public has_bootstrapped: boolean = false;

  // inventory
  public is_doing_inventory: boolean = false;
  public has_inventory_ready: boolean = false;
  public is_inventory_waiting_user: boolean = false;
  public is_obtaining_inventory: boolean = false;
  public has_obtained_inventory: boolean = false;
  public has_selected_solution: boolean = false;
  public is_submitting_solution: boolean = false;

  public inventory_devices: InventoryDevice[] = [];
  public available_raw_size: number = 0;
  public solutions: {[id: string]: SolutionItem} = {};
  public selected_solution: SolutionItem|undefined = undefined;

  public is_provisioning: boolean = false;

  // services
  public nfs_exports: string[] = [];

  public is_doing_services: boolean = false;
  public is_services_waiting_user: boolean = false;
  public is_confirming_services: boolean = false;
  public is_services_confirmed: boolean = false;
  public is_creating_services: boolean = false;
  public is_services_done: boolean = false;

  // ready
  public is_ready: boolean = false;


  public constructor(
    private _http: HttpClient,
    private _router: Router
  ) { }

  public ngOnInit(): void {
    this._obtainStatus();
  }

  private _obtainStatus(): void {

    if (this.is_ready) {
      return;
    }

    this._http.get<StatusReply>("/api/status")
    .subscribe(this._handleStatus.bind(this));
    interval(5000).pipe(take(1)).subscribe(this._obtainStatus.bind(this));
  }

  private _statusOn(state: string): void {

    console.log("> state name: ", state);

    if (state.startsWith("bootstrap") || state.startsWith("auth")) {
      this.current_step = this.statelst.indexOf("bootstrap");
    } else if (state.startsWith("inventory")) {
      this.current_step = this.statelst.indexOf("inventory");
    } else if (state.startsWith("provision")) {
      this.current_step = this.statelst.indexOf("provision");
    } else if (state.startsWith("service")) {
      this.current_step = this.statelst.indexOf("service");
    } else if (state === "ready") {
      this.current_step = this.statelst.indexOf("ready");
    } else {
      this.current_step = -1;
    }

    this.is_bootstrapping =
      (state.startsWith("bootstrap") || state.startsWith("auth"));
    this.is_doing_inventory = (state.startsWith("inventory"));
    this.is_provisioning = (state.startsWith("provision"));
    this.is_doing_services = (state.startsWith("service"));
    this.is_ready = (state === "ready");

    if (state === "inventory_start" || state === "inventory_wait") {
      if (!this.has_obtained_inventory && !this.is_obtaining_inventory) {
        this.has_inventory_ready = true;
      }
    }
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
    this.is_inventory_waiting_user = true;
  }

  private _obtainInventory(): void {
    this.is_obtaining_inventory = true;
    this._http.get<InventoryReply>("/api/inventory").subscribe({
      next: (res: InventoryReply) => {
        console.log(res);
        this.has_obtained_inventory = true;
        this._handleInventory(res);
      },
      error: (err) => {
        console.error("error obtaining inventory: ", err);
        this.is_obtaining_inventory = false;
      }
    });
  }

  private _handleStatus(reply: StatusReply): void {

    const status: string = reply.status.toLowerCase();
    this._statusOn(status);

    if (this.has_inventory_ready && !this.is_obtaining_inventory &&
        !this.has_obtained_inventory
    ) {
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

    this.is_submitting_solution = true;

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
