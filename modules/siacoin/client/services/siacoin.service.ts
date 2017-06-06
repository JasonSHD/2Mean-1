/**
 * Angular 2 core injectable object for creating services.
 */
import { Injectable, Inject } from '@angular/core';

/**
 * Pull in the necessary HTTP objects.
 */
import {
  Http,
  Response,
  HttpModule,
  RequestOptions,
  Request,
  RequestMethod,
  Headers
} from '@angular/http';

import { Observable } from 'rxjs/Rx';

/*
 * Reactive library.
 */
import 'rxjs/add/operator/map';

/**
 * The main siacoin service class.
 */
@Injectable()
export class SiacoinService {
  constructor(
    private http: Http
  ) { 

  }

  currentHash(walletAddress: String) {
    if (walletAddress) {
      return this.http.get('api/siacoin/stats/' + walletAddress);
    } else {
      return null;
    }
  }
}
