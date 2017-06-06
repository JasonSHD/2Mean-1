/* Vendor */
import { Component }        from '@angular/core';
import { BrowserModule }    from '@angular/platform-browser';
import { Router }           from '@angular/router';

import { Observable }       from 'rxjs/Rx';

import { SiacoinService }   from '../services/siacoin.service.ts';

@Component({
  templateUrl: './../views/siacoin-hashrate.view.html'
})
export class SiacoinHashWidgetComponent {
  walletAddress: String = null;

  hashRate: Number = 0;

  refreshTimer: any;

  errors: any = {
    css: '',
    error: null
  };

  constructor (private siaService: SiacoinService) {
    this.refreshTimer = Observable.interval(15000);

    this.refreshTimer.subscribe(
      (x: any) => {
        this.getHashRate();
      });
  }

  getHashRate() {
    if (!this.walletAddress) {
      return '';
    } else {
      this.siaService.currentHash(this.walletAddress).subscribe(
        (data: any) => {
          this.hashRate = data.data;
        },
        (error: any) => {
        },
        () => {
        });
    }
  }
}

