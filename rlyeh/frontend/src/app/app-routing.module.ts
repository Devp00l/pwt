import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BootstrapComponent } from './bootstrap/bootstrap.component';
import { ChooseOperationComponent } from './startup/choose-operation/choose-operation.component';
import { StartupComponent } from './startup/startup.component';

const routes: Routes = [
  { path: "", component: StartupComponent },
  { path: "choose-operation", component: ChooseOperationComponent },
  { path: "bootstrap", component: BootstrapComponent },
  { path: "**", component: StartupComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
