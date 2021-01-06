import { TestBed } from '@angular/core/testing';

import { BackendStateService } from './backend-state.service';

describe('BackendStateService', () => {
  let service: BackendStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BackendStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
