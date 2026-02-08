import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ContactService],
    });

    service = TestBed.inject(ContactService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should submit the contact form payload', () => {
    const payload = {
      name: 'Nyota Uhura',
      email: 'uhura@enterprise.com',
      topic: 'feedback',
      message: 'Hailing frequencies open.',
    };

    service.submitContactForm(payload).subscribe(response => {
      expect(response).toEqual({
        id: '1',
        status: 'received',
        receivedAt: '2026-02-08T00:00:00Z',
      });
    });

    const req = httpMock.expectOne(API_URLS.CONTACT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({
      id: '1',
      status: 'received',
      receivedAt: '2026-02-08T00:00:00Z',
    });
  });
});
