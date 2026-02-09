import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  ContactSubmissionRequest,
  ContactSubmissionResponse,
} from './models/contact-form.models';

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private readonly http = inject(HttpClient);

  submitContactForm(
    payload: ContactSubmissionRequest,
  ): Observable<ContactSubmissionResponse> {
    return this.http.post<ContactSubmissionResponse>(API_URLS.CONTACT, payload);
  }
}
