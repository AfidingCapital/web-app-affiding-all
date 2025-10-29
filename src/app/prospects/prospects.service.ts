import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { head } from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class ProspectsService {
  private base = '/prospects';

  constructor(private http: HttpClient) {}
  
  getProspect(prospectId: string){
	const url = `${this.base}/${prospectId}`; // ex: /api/v1/prospects/1
	return this.http.get(url);
  }

  // GET uniquement: récupère les prospects avec pagination et tri
  getProspects(orderBy: string, sortOrder: string, offset: number, limit: number): Observable<any> {
    const headers = new HttpHeaders().set('Sec-Fetch-Mode', 'no-cors');
    const httpParams = new HttpParams()
      .set('offset', offset.toString())
      .set('limit', limit.toString())
      .set('sortOrder', sortOrder)
      .set('orderBy', orderBy);

    console.log('ProspectsService.getProspects called with', {
      orderBy,
      sortOrder,
      offset,
      limit,
      httpParams: httpParams.toString()
    });

    return this.http.get(`${this.base}`, { params: httpParams, headers: headers});
  }

  searchByText(text: string, page: number, pageSize: number, sortAttribute: string = '', sortDirection: string = '') {
    let request: any = {
      request: {
        text
      },
      page,
      size: pageSize
    };
    if (sortAttribute !== '' && sortDirection !== '') {
      request = {
        ...request,
        sorts: [
          {
            direction: sortDirection,
            property: sortAttribute
          }
        ]
      };
    }
    const httpParams = new HttpParams()
    return this.http.get(this.base, { params: httpParams });
  }
  
  acceptProspect(prospectId: string){
  	const url = `${this.base}/accept/${prospectId}`;
  	return this.http.post(url,{});
  }
  
  rejectProspect(prospectId: string){
  	const url = `${this.base}/reject/${prospectId}`;
  	return this.http.post(url,{});
  }
}