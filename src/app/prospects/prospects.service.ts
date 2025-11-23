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

  // Locale courante de l'application
  // Initialisée depuis le navigateur, peut être mise à jour à tout moment
  private _locale: string = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
  get locale(): string { return this._locale; }
  set locale(l: string) { this._locale = l && l.trim() ? l : 'en-US'; }

  constructor(private http: HttpClient) {}

  // GET /prospects/{prospectId}
  getProspect(prospectId: string): Observable<any> {
    const url = `${this.base}/${prospectId}`; // ex: /prospects/1
    return this.http.get(url);
  }

  // GET uniquement: récupère les prospects avec pagination et tri
  // Version harmonisée: utilise page/limit et optionnel sorting via direction/property
  getProspects(
    orderBy: string,
    sortOrder: string,
    page: number,
    limit: number,
    statusFilter?: string | number
  ): Observable<any> {
    let httpParams = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (orderBy) httpParams = httpParams.set('orderBy', orderBy);
    if (sortOrder) httpParams = httpParams.set('sortOrder', sortOrder);

    // Filtre de statut ajouté si fourni
    if (statusFilter != null && statusFilter !== '') {
      httpParams = httpParams.set('status', statusFilter.toString());
    }

    return this.http.get(this.base, { params: httpParams });
  }

  // Petite utilitaire interne pour découper une date si nécessaire (jour / mois / année)
  private splitDateLabel(iso?: string): { day: string, monthKey: string, year: string } | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const day = String(d.getDate());
    // Clé simple pour traduction du mois en anglais; peut être adaptée
    const monthKey = new Intl.DateTimeFormat('en', { month: 'long' }).format(d);
    const year = String(d.getFullYear());
    return { day, monthKey, year };
  }

  // Ajout d'une méthode pour obtenir jour, mois (clé de traduction) et année
  private getDatePartsForLocale(iso?: string): { day: number; monthKey: string; year: number } | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;

    // Jour
    const day = d.getDate();
    // Mois en anglais (clé pour traduction)
    const monthEn = new Intl.DateTimeFormat('en', { month: 'long' }).format(d).toLowerCase();
    const monthKey = `months.${monthEn}`; // ex: months.november
    // Année
    const year = d.getFullYear();

    return { day, monthKey, year };
  }

  formatDatePartsForLocale(iso?: string): { day: number; monthKey: string; year: number } | null {
    return this.getDatePartsForLocale(iso);
  }

  // Formatage de date en fonction de la locale actuelle
  formatDateNeeded(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // Jour
    const day = d.getDate();
    // Mois selon locale courante
    const moisTexteCourant = new Intl.DateTimeFormat(this.locale, { month: 'long' }).format(d);
    const year = d.getFullYear();

    // Format attendu: "7 novembre 2025" (fr-FR) ou "7 November 2025" (en-US), etc.
    return `${day} ${moisTexteCourant} ${year}`;
  }

  // Recherche par texte avec pagination et tri optionnel
  searchByText(
    statusParam: string,
    text: string,
    page: number,
    pageSize: number,
    sortAttribute: string = '',
    sortDirection: string = ''
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', pageSize.toString())
      .set('status', statusParam);

    if (text != null && text.trim() !== '') {
      params = params.set('text', text.trim());
    }

    if (sortAttribute && sortDirection) {
      const dir = sortDirection.toUpperCase();
      params = params.set('direction', dir).set('property', sortAttribute);
    }

    return this.http.get(this.base, { params });
  }

  // Nouvelle: gender description via /prospects/tpt
  getGenderDescription(): Observable<any> {
    const url = this.genderDescriptionBase; // /prospects/tpt
    return this.http.get(url);
  }

  // Mapping centralisé du statut
  public mapStatus(status: string | number | undefined): string {
    if (status == null) return '—';
    const map: Record<string, string> = {
      '0': 'Error',
      '1': 'New',
      '2': 'Accepted',
      '3': 'Rejected',
      '4': 'Expired'
    };
    const key = String(status);
    return map[key] ?? key;
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
    return this.http.get(`/prospects/${prospectId}/images`, { responseType: 'text' });
  }
}