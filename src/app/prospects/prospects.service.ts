import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProspectsService {
  // Base relatif, conformément à votre fichier d'origine
  private base = '/prospects';

  // genderDescription endpoint construit dynamiquement: `${base}/tpt`
  private get genderDescriptionBase(): string {
    return `${this.base}/tpt`;
  }

  // Placeholder public pour usage dans les composants si besoin
  public defaultPlaceholder: string = '/assets/user_placeholder.png';

  constructor(private http: HttpClient) {}

  // GET /prospects/{prospectId}
  getProspect(prospectId: string): Observable<any> {
    const url = `${this.base}/${prospectId}`; // ex: /prospects/1
    return this.http.get(url);
  }

  // GET uniquement: récupère les prospects avec pagination et tri
  // Version harmonisée: utilise page/limit et optionnel sorting via direction/property
  getProspects(orderBy: string, sortOrder: string, page: number, limit: number): Observable<any> {
    const httpParams = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('orderBy', orderBy)
      .set('sortOrder', sortOrder);

    return this.http.get(this.base, { params: httpParams });
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
  // Version harmonisée: retourne la même structure quelle que soit l’API
  searchByText(
    text: string,
    page: number,
    pageSize: number,
    sortAttribute: string = '',
    sortDirection: string = ''
  ): Observable<any> {
    // Construction des paramètres GET plats
    // Version sans texte dans l’URL (à adapter si votre API attend texte)
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', pageSize.toString());

    // Tri optionnel
    if (sortAttribute && sortDirection) {
      const dir = sortDirection.toUpperCase();
      params = params.set('direction', dir).set('property', sortAttribute);
    }

    // Si votre API attend le texte sous un paramètre précis, décommentez et adaptez:
    // params = params.set('text', text); // ou .set('query', text)

    return this.http.get(this.base, { params });
  }

  // Nouvelle: gender description via /prospects/tpt
  getGenderDescription(): Observable<any> {
    const url = this.genderDescriptionBase; // /prospects/tpt
    return this.http.get(url);
  }

  acceptProspect(prospectId: string): Observable<any> {
    const url = `${this.base}/${prospectId}/accept`;
    return this.http.post(url, {});
  }

  rejectProspect(prospectId: string): Observable<any> {
    const url = `${this.base}/${prospectId}/reject`;
    return this.http.post(url, {});
  }

  getProspectProfileImage(prospectId: string): Observable<any> {
    // Option: ajouter des params si nécessaire
    //const httpParams = new HttpParams().set('maxHeight', '150');
    return this.http.get(`/prospects/${prospectId}/images`, { responseType: 'text' });
  }
}