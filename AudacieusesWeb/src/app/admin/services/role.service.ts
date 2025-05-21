import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = `${environment.apiUrl}/auth/roles`;

  constructor(private http: HttpClient) { }

  getAllRoles(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
} 