/** Angular Imports */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

/** rxjs Imports */
import { Observable } from 'rxjs';

/** Custom Models */
import { User } from './user.model';

/** 
 * Self service users service.
 *
 * Harmonisé avec les 4 fichiers pour compatibilité avec le view-user.
 */
export interface SelfRegistrationPayload {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  officeId: string | number;
  roles: number[];          // un ou plusieurs rôles
  sendPasswordToEmail: boolean;

  // Champs optionnels
  staffId?: string | number;
  isSelfServiceUser?: boolean;
  passwordNeverExpires?: boolean;
  clients?: (string | number)[];

  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private base = 'https://cbs-server.afidingcapital.com/fineract-provider/api/v1/users';
  /**
   * @param {HttpClient} http Http Client to send requests.
   */
  constructor(private http: HttpClient) {}

  /**
   * Gets all the self service users.
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  activateUser(id: number): Observable<any> {
    return this.http.post(`${this.base}/${id}/activate`, {});
  }

  deactivateUser(id: number): Observable<any> {
    return this.http.post(`${this.base}/${id}/deactivate`, {});
  }

  /**
   * Change User Password.
   * @param userId User Id of users
   * @param password New Password of the user
   * @returns {Observable<any>}
   *
   * TODO: update endpoint once API available
   */
  changePassword(userId: string, passwordObj: any) {
    // Utilise un endpoint supposé
    // Adapté pour être cohérent avec la base
    return this.http.put(`${this.base}/${userId}/password`, passwordObj);
  }

  registerSelfServiceUser(payload: SelfRegistrationPayload): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Mifos-Platform-TenantId': 'default'
    });
    
    return this.http.post(`${this.base}`, payload, { headers });
  }
}