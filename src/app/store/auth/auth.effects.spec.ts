import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { AuthEffects } from './auth.effects';
import { TokenService } from '../../services/token.service';
import * as AuthActions from './auth.actions';
import * as UserActions from '../user/user.actions';

describe('AuthEffects', () => {
  let actions$: Observable<any>;
  let effects: AuthEffects;
  let mockTokenService: jasmine.SpyObj<TokenService>;

  beforeEach(() => {
    mockTokenService = jasmine.createSpyObj<TokenService>('TokenService', [
      'refreshToken',
      'removeToken',
      'extractUserRole',
      'isTokenExpired',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        { provide: TokenService, useValue: mockTokenService },
      ],
    });

    effects = TestBed.inject(AuthEffects);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('restoreAuth$', () => {
    it('should always dispatch refreshToken to synchronize session even if a stale token exists in localStorage', (done) => {
      // Simulate an older token remaining in localStorage after cross-app session rotation
      localStorage.setItem('authToken', 'stale-access-token-123');

      actions$ = of(AuthActions.restoreAuthFromStorage());

      effects.restoreAuth$.subscribe((action) => {
        expect(action).toEqual(AuthActions.refreshToken());
        done();
      });
    });
  });

  describe('refreshToken$', () => {
    it('should update localStorage and dispatch refreshTokenSuccess and loginSuccess on successful token refresh', (done) => {
      const newAccessToken = 'fresh-token-456';
      mockTokenService.refreshToken.and.returnValue(
        of({ accessToken: newAccessToken })
      );
      mockTokenService.extractUserRole.and.returnValue('Admin');

      actions$ = of(AuthActions.refreshToken());

      const emittedActions: any[] = [];
      effects.refreshToken$.subscribe({
        next: (action) => {
          emittedActions.push(action);
          if (emittedActions.length === 2) {
            expect(localStorage.getItem('authToken')).toBe(newAccessToken);
            expect(emittedActions[0]).toEqual(
              AuthActions.refreshTokenSuccess({ accessToken: newAccessToken })
            );
            expect(emittedActions[1]).toEqual(
              AuthActions.loginSuccess({
                accessToken: newAccessToken,
                role: 'Admin',
              })
            );
            done();
          }
        },
      });
    });

    it('should clean localStorage and dispatch refreshTokenFailure when refresh fails', (done) => {
      localStorage.setItem('authToken', 'old-token');
      mockTokenService.refreshToken.and.returnValue(
        throwError(() => ({ status: 401, message: 'Invalid credentials.' }))
      );

      actions$ = of(AuthActions.refreshToken());

      effects.refreshToken$.subscribe((action) => {
        expect(localStorage.getItem('authToken')).toBeNull();
        expect(action.type).toBe(AuthActions.refreshTokenFailure.type);
        done();
      });
    });
  });
});
