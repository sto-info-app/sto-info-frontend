import { TestBed } from '@angular/core/testing';

import { BehaviorSubject } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FLEET_FEATURES_DISABLED,
  FleetFeatureState,
} from 'src/app/models/fleet.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

import { ChatSessionService } from './chat-session.service';
import { ChatSocketService } from './chat-socket.service';

describe('ChatSessionService', () => {
  let signedIn$: BehaviorSubject<boolean>;
  let features$: BehaviorSubject<FleetFeatureState>;
  let socket: { ready: jest.Mock; disconnect: jest.Mock };
  let session: ChatSessionService;

  beforeEach(() => {
    signedIn$ = new BehaviorSubject(false);
    features$ = new BehaviorSubject(FLEET_FEATURES_DISABLED);
    socket = {
      ready: jest.fn(() => Promise.resolve()),
      disconnect: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated$: signedIn$ } },
        {
          provide: FleetConfigurationService,
          useValue: { getFeatures: () => features$ },
        },
        { provide: ChatSocketService, useValue: socket },
      ],
    });
    session = TestBed.inject(ChatSessionService);
  });

  const chatOn = (chatEnabled: boolean): void =>
    features$.next({ ...FLEET_FEATURES_DISABLED, chatEnabled });

  it('opens the socket while somebody is signed in and chat is on, and closes it otherwise', () => {
    session.start();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);

    chatOn(true);
    expect(socket.ready).not.toHaveBeenCalled();

    signedIn$.next(true);
    expect(socket.ready).toHaveBeenCalledTimes(1);

    // Nothing changes while both still hold.
    features$.next({
      ...FLEET_FEATURES_DISABLED,
      chatEnabled: true,
      isEnabled: true,
    });
    expect(socket.ready).toHaveBeenCalledTimes(1);

    signedIn$.next(false);
    expect(socket.disconnect).toHaveBeenCalledTimes(2);

    signedIn$.next(true);
    chatOn(false);
    expect(socket.disconnect).toHaveBeenCalledTimes(3);
  });

  it('starts once, however often asked', () => {
    session.start();
    session.start();
    chatOn(true);
    signedIn$.next(true);

    expect(socket.ready).toHaveBeenCalledTimes(1);
  });

  it('shrugs off a socket that cannot open, such as when signed out', async () => {
    socket.ready.mockReturnValue(Promise.reject(new Error('Sign in')));
    session.start();
    chatOn(true);
    signedIn$.next(true);
    await Promise.resolve();

    expect(socket.ready).toHaveBeenCalled();
  });
});
