import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProspectsService {
  private base = '/prospects';
  // genderDescription endpoint construit dynamiquement: `${base}/tpt`
  private get genderDescriptionBase(): string {
    return `${this.base}/tpt`;
  }

  constructor(private http: HttpClient) {}

  // GET /prospects/{prospectId}
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

    return this.http.get(`${this.base}`, { params: httpParams, headers: headers});
  }

  // Dans ProspectsService
formatDateNeeded(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

  // Recherche par texte avec pagination et tri optionnel
  searchByText(text: string, page: number, pageSize: number, sortAttribute: string = '', sortDirection: string = ''): Observable<any> {
    let params = new HttpParams()
      .set('text', text)
      .set('page', String(page))
      .set('size', String(pageSize));

    if (sortAttribute && sortDirection) {
      // Si l’API attend un format différent, ajuste
      params = params.set('sort', `${sortAttribute},${sortDirection}`);
    }

    return this.http.get(this.base, { params });
  }

  // Nouvelle: gender description via /prospects/tpt
  getGenderDescription(): Observable<any> {
    const url = this.genderDescriptionBase; // /prospects/tpt
    return this.http.get(url);
  }

  acceptProspect(prospectId: string){
    const url = `${this.base}/${prospectId}/accept`;
    return this.http.post(url, {});
  }

  rejectProspect(prospectId: string){
    const url = `${this.base}/${prospectId}/reject`;
    return this.http.post(url, {});
  }

  getProspectProfileImage(prospectId: string) {
    //const httpParams = new HttpParams().set('maxHeight', '150');
    return this.http
      .skipErrorHandler()
      .get(`/prospects/${prospectId}/images`, { responseType: 'text' });
  }
}