import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ReportsService } from '../reports.service';

@Injectable({
  providedIn: 'root'
})
export class ReportAccessGuard implements CanActivate {
  constructor(
    private reportsService: ReportsService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const reportName = route.params['name'];
    
    return this.reportsService.isReportAccessible(reportName).pipe(
      take(1),
      map(isAccessible => {
        if (isAccessible) {
          return true;
        } else {
          // Redirect to the reports list if the user doesn't have access
          return this.router.createUrlTree(['/reports']);
        }
      })
    );
  }
}
