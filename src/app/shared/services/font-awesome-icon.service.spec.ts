import { TestBed } from '@angular/core/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { FontAwesomeIconService } from './font-awesome-icon.service';

describe('FontAwesomeIconService', () => {
  let service: FontAwesomeIconService;
  let librarySpy: jest.Mocked<FaIconLibrary>;

  beforeEach(() => {
    librarySpy = {
      addIcons: jest.fn(),
    } as unknown as jest.Mocked<FaIconLibrary>;

    TestBed.configureTestingModule({
      providers: [
        FontAwesomeIconService,
        { provide: FaIconLibrary, useValue: librarySpy },
      ],
    });
    service = TestBed.inject(FontAwesomeIconService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add icons on initialization', () => {
    // Logic is in constructor, so it runs when service is injected
    expect(librarySpy.addIcons).toHaveBeenCalled();
  });
});
