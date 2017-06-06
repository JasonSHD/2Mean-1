/* Vendor */
import { NgModule }                       from '@angular/core';
import { BrowserModule }                  from '@angular/platform-browser';
import { RouterModule, Routes }           from '@angular/router';

/* Services */
import { SiacoinService }       from './services/siacoin.service';

/* Components */
import { SiacoinComponent }     from './components/siacoin.component';
import { SiacoinHashWidgetComponent } from './components/siacoin-hashrate.component';

/* Routing Module */
import { SiacoinRoutingModule } from './config/siacoin-routing.module';

@NgModule({
  imports: [
    BrowserModule,
    SiacoinRoutingModule
  ],
  declarations: [
    SiacoinComponent,
    SiacoinHashWidgetComponent
  ],
  exports: [
    SiacoinHashWidgetComponent
  ],
  /* You may want to inject this token higher up in the DI tree. For more
   * info:
   * https://angular.io/docs/ts/latest/guide/dependency-injection.html
   */
  providers: [
    SiacoinService
  ],
  bootstrap: [
    SiacoinComponent
  ]
})
export class SiacoinModule {}
