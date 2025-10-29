/** Angular Imports */
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

/** Custom Services */
import { ProspectsService } from './prospects.service';

/**
 * Prospect data resolver.
 */
@Injectable()
export class ProspectResolver implements Resolve<Object> {
  /**
   * @param {ProspectsService} prospectsService Prospects service.
   */
  constructor(private prospectsService: ProspectsService) {}

  /**
   * Returns the user data.
   * @returns {Observable<any>}
   */
  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const userId = route.paramMap.get('id');
    return this.prospectsService.getProspect(userId);
  }
}
