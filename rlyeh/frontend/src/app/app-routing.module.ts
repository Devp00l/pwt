import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BootstrapComponent } from './bootstrap/bootstrap.component';
import { StartupComponent } from './startup/startup.component';

const routes: Routes = [
  { path: "", component: StartupComponent },
  { path: "bootstrap", component: BootstrapComponent },
  { path: "**", component: StartupComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
