/** Angular Imports */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

/** rxjs Imports */
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/** Custom Models */
import { ReportParameter } from './common-models/report-parameter.model';
import { SelectOption } from './common-models/select-option.model';
import { ChartData } from './common-models/chart-data.model';
import { SystemService } from '../system/system.service';
import { AuthenticationService } from '../core/authentication/authentication.service';

/**
 * Reports service.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  /**
   * @param {HttpClient} http Http Client to send requests.
   * @param {SystemService} systemService System Service.
   */
  constructor(private http: HttpClient, private systemService: SystemService, private authenticationService: AuthenticationService) {}

  /**
   * @returns {Observable<any>} Reports data
   */
  getReports(): Observable<any> {
    const credentials = this.authenticationService.getCredentials();
    const userRoles = credentials ? credentials.roles : [];
    const isSuperAgent = userRoles.some((role: any) => role.name === "Super agent");
    if (isSuperAgent) {
      return this.http.get<any[]>('/reports').pipe(
        map(reports => reports.filter(report => report.reportName === "Client Listing" || report.reportName === "Client Loans Listing" || report.reportName === "Activite"))
      );
    } else {
      return this.http.get('/reports');
    }
  }

  /**
   * Checks if the current user (super agent) has access to a specific report.
   * @param {string} reportName The name of the report to check
   * @returns {Observable<boolean>} True if the report is accessible, false otherwise
   */
  isReportAccessible(reportName: string): Observable<boolean> {
    const credentials = this.authenticationService.getCredentials();
    const userRoles = credentials ? credentials.roles : [];
    const isSuperAgent = userRoles.some((role: any) => role.name === "Super agent");
    
    if (!isSuperAgent) {
      // Non-super agents have access to all reports
      return new Observable(observer => {
        observer.next(true);
        observer.complete();
      });
    }

    // Super agents only have access to specific reports
    const allowedReports = ["Client Listing", "Client Loans Listing", "Activite"];
    return new Observable(observer => {
      observer.next(allowedReports.includes(reportName));
      observer.complete();
    });
  }

  /**
   * Checks if the current user is a super agent.
   * @returns {boolean} True if the user is a super agent, false otherwise
   */
  isSuperAgent(): boolean {
    const credentials = this.authenticationService.getCredentials();
    const userRoles = credentials ? credentials.roles : [];
    return userRoles.some((role: any) => role.name === "Super agent");
  }

  /**
   * Gets the office ID of the current user.
   * @returns {number | null} The office ID of the current user, or null if not available
   */
  getUserOfficeId(): number | null {
    const credentials = this.authenticationService.getCredentials();
    return credentials ? credentials.officeId : null;
  }

  /**
   * Gets the office name of the current user.
   * @returns {string | null} The office name of the current user, or null if not available
   */
  getUserOfficeName(): string | null {
    const credentials = this.authenticationService.getCredentials();
    return credentials ? credentials.officeName : null;
  }

  /**
   * @returns {Observable<any>} Mix Taxonomy data
   */
  getMixTaxonomyArray(): Observable<any> {
    return this.http.get('/mixtaxonomy');
  }

  /**
   * @returns {Observable<any>} Mix Taxonomy data
   */
  getMixMappings(): Observable<any> {
    return this.http.get('/mixmapping');
  }

  /**
   * @param {any} mixMappingData Mix Mapping data to be posted
   * @returns {Observable<any>} response code
   */
  editMixMappings(mixMappingData: any): Observable<any> {
    return this.http.put('/mixmapping', mixMappingData);
  }

  /**
   * @param {any} dates start date and end date
   * @returns {Observable<any>} Mix Report
   */
  getMixReport(dates: any): Observable<any> {
    const httpParams = new HttpParams().set('startDate', dates.startDate).set('endDate', dates.endDate);
    return this.http.get('/mixreport', { params: httpParams, responseType: 'text' });
  }

  /**
   * @param {string} reportName Report name for which parameters are needed.
   * @returns {Observable<ReportParameter[]>}
   */
  getReportParams(reportName: string): Observable<ReportParameter[]> {
    const httpParams = new HttpParams().set('R_reportListing', `'${reportName}'`).set('parameterType', 'true');
    return this.http
      .get(`/runreports/FullParameterList`, { params: httpParams })
      .pipe(map((response: any) => response.data.map((entry: any) => new ReportParameter(entry.row))));
  }

  /**
   * @param {string} inputString URL substring containing object details.
   * @returns {Observable<SelectOption[]>}
   */
  getSelectOptions(inputString: string): Observable<SelectOption[]> {
    const credentials = this.authenticationService.getCredentials();
    const userOfficeId = credentials ? credentials.officeId : null;
    
    const httpParams = new HttpParams().set('parameterType', 'true');
    return this.http
      .get(`/runreports/${inputString}`, { params: httpParams })
      .pipe(
        switchMap((response: any) => {
          let options: SelectOption[] = response.data.map((entry: any) => new SelectOption(entry.row));
          
          // For office-related selects, replace nameDecorated with name and use /offices order
          const isOfficeParam = inputString.toLowerCase().includes('officename') || inputString.toLowerCase().includes('officeid');
          if (isOfficeParam) {
            return this.http.get<any[]>('/offices').pipe(
              map((offices: any[]) => {
                // Build a map of office id -> office name from /offices API
                const officeNameMap = new Map<number, string>();
                offices.forEach((office: any) => {
                  officeNameMap.set(office.id, office.name);
                });

                // Replace nameDecorated with actual name from /offices API
                options.forEach((option: SelectOption) => {
                  if (officeNameMap.has(option.id)) {
                    option.name = officeNameMap.get(option.id);
                  }
                });

                // Filter by user's office and ALL its descendants if applicable
                let filteredOffices = offices;
                const userOfficeIdNum = Number(userOfficeId);
                if (userOfficeId !== null && userOfficeId !== undefined) {
                  const allowedOfficeIds = new Set<number>();
                  allowedOfficeIds.add(userOfficeIdNum);
                  
                  // Build parent-child map for recursive descendant finding
                  const childrenMap = new Map<number, any[]>();
                  offices.forEach((office: any) => {
                    if (office.parentId) {
                      if (!childrenMap.has(office.parentId)) {
                        childrenMap.set(office.parentId, []);
                      }
                      childrenMap.get(office.parentId).push(office);
                    }
                  });
                  
                  // Recursively add all descendants
                  const addDescendants = (officeId: number) => {
                    const children = childrenMap.get(officeId) || [];
                    children.forEach((child: any) => {
                      allowedOfficeIds.add(child.id);
                      addDescendants(child.id); // Recursively add grandchildren
                    });
                  };
                  addDescendants(userOfficeIdNum);
                  
                  // Filter both options and offices to show user's office, all descendants, and "All" option
                  options = options.filter((option: SelectOption) => 
                    allowedOfficeIds.has(option.id) || option.id === -1
                  );
                  filteredOffices = offices.filter((office: any) => allowedOfficeIds.has(office.id));
                }

                // Sort options in hierarchical tree order: parent followed by children
                // Build tree-order index from filtered offices
                const treeOrder = this.buildOfficeTreeOrder(filteredOffices);
                const officeOrderMap = new Map<number, number>();
                treeOrder.forEach((id: number, index: number) => {
                  officeOrderMap.set(id, index);
                });

                options.sort((a: SelectOption, b: SelectOption) => {
                  if (a.id === -1) return 1; // "All" option at the end
                  if (b.id === -1) return -1;
                  const orderA = officeOrderMap.has(a.id) ? officeOrderMap.get(a.id) : Number.MAX_SAFE_INTEGER;
                  const orderB = officeOrderMap.has(b.id) ? officeOrderMap.get(b.id) : Number.MAX_SAFE_INTEGER;
                  return orderA - orderB;
                });
                
                return options;
              })
            );
          }
          
          return of(options);
        })
      );
  }

  /**
   * Builds a flat array of office IDs in hierarchical tree order.
   * Parent offices are followed immediately by their children (depth-first).
   * @param {any[]} offices Array of office objects from /offices API
   * @returns {number[]} Array of office IDs in tree order
   */
  private buildOfficeTreeOrder(offices: any[]): number[] {
    // Build a map of parentId -> children
    const childrenMap = new Map<number, any[]>();
    const officeMap = new Map<number, any>();
    let rootOffices: any[] = [];

    // First pass: build office map and identify potential roots
    offices.forEach((office: any) => {
      officeMap.set(office.id, office);
    });

    // Second pass: build parent-child relationships, avoiding circular references
    offices.forEach((office: any) => {
      if (!office.parentId) {
        rootOffices.push(office);
      } else {
        // Check for circular reference (office's parent is its own child)
        const parent = officeMap.get(office.parentId);
        if (parent && parent.parentId !== office.id) {
          if (!childrenMap.has(office.parentId)) {
            childrenMap.set(office.parentId, []);
          }
          childrenMap.get(office.parentId).push(office);
        } else {
          // Treat as root if circular reference detected
          rootOffices.push(office);
        }
      }
    });

    // Depth-first traversal to build tree order (with cycle detection)
    const result: number[] = [];
    const visited = new Set<number>();
    
    const traverse = (office: any) => {
      if (visited.has(office.id)) {
        return; // Avoid infinite loops
      }
      visited.add(office.id);
      result.push(office.id);
      const children = childrenMap.get(office.id) || [];
      children.forEach((child: any) => traverse(child));
    };

    rootOffices.forEach((root: any) => traverse(root));
    return result;
  }

  /**
   * @param {number} reportId Report id for which pentaho parameters are needed.
   * @returns {Observable<any>}
   */
  getPentahoParams(reportId: number): Observable<any> {
    const httpParams = new HttpParams().set('fields', 'reportParameters');
    return this.http
      .get(`/reports/${reportId}`, { params: httpParams })
      .pipe(map((response: any) => response.reportParameters));
  }

  /**
   * Run Report Data for Table and SMS.
   * @param {any} reportName report name
   * @param {object} formData Form Data.
   * @returns {Observable<any>}
   */
  getRunReportData(reportName: string, formData: object): Observable<any> {
    let httpParams = new HttpParams();
    for (const [
      key,
      value
    ] of Object.entries(formData)) {
      httpParams = httpParams.set(key, value);
    }
    return this.http.get(`/runreports/${reportName}`, { params: httpParams });
  }

  /**
   * Run Report Data for Charts.
   * @param {any} reportName report name
   * @param {object} formData Form Data.
   * @returns {Observable<ChartData>}
   */
  getChartRunReportData(reportName: string, formData: object): Observable<ChartData> {
    let httpParams = new HttpParams();
    for (const [
      key,
      value
    ] of Object.entries(formData)) {
      httpParams = httpParams.set(key, value);
    }
    return this.http
      .get(`/runreports/${reportName}`, { params: httpParams })
      .pipe(map((response: any) => new ChartData(response)));
  }

  /**
   * Run Report Data for Pentaho.
   * @param {any} reportName report name
   * @param {object} formData Form Data.
   * @returns {Observable<any>}
   */
  getPentahoRunReportData(
    reportName: string,
    formData: object,
    tenantIdentifier: string,
    locale: string,
    dateFormat: string
  ): Observable<any> {
    let httpParams = new HttpParams()
      .set('tenantIdentifier', tenantIdentifier)
      .set('locale', locale)
      .set('dateFormat', dateFormat);
    for (const [
      key,
      value
    ] of Object.entries(formData)) {
      httpParams = httpParams.set(key, value);
    }
    return this.http.get(`/runreports/${reportName}`, {
      responseType: 'arraybuffer',
      observe: 'response',
      params: httpParams
    });
  }
}
