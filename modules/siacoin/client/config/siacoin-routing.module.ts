/* Vendor */
import { NgModule }				            from '@angular/core';
import { RouterModule, Routes }       from '@angular/router';

/* Components */
import { SiacoinComponent } from '../components/siacoin.component';
import { SiacoinHashWidgetComponent } from '../components/siacoin-hashrate.component';

/* this defines the global siacoin routes */
const SiacoinRoutes: Routes = [
  {
    path: 'siacoin',
    component: SiacoinComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(SiacoinRoutes)
  ],
  exports: [
    RouterModule
  ]
})
export class SiacoinRoutingModule {}
