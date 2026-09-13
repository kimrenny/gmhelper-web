import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { EMPTY, of, timer } from 'rxjs';
import { catchError, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import * as AuthActions from './auth.actions';
import * as UserActions from '../user/user.actions';
import { TokenService } from '../../services/token.service';

@Injectable()
export class AuthEffects {
  constructor(private actions$: Actions, private tokenService: TokenService) {}

  restoreAuth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.restoreAuthFromStorage),
      switchMap(() => of(AuthActions.refreshToken()))
    )
  );

  loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      tap(({ accessToken }) => {
        localStorage.setItem('authToken', accessToken);
      }),
      switchMap(() => of(UserActions.initUser()))
    )
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.refreshToken),
      switchMap(() =>
        this.tokenService.refreshToken().pipe(
          mergeMap((response) => {
            localStorage.setItem('authToken', response.accessToken);
            const role = this.tokenService.extractUserRole(
              response.accessToken
            );
            return [
              AuthActions.refreshTokenSuccess({
                accessToken: response.accessToken,
              }),
              AuthActions.loginSuccess({
                accessToken: response.accessToken,
                role,
              }),
            ];
          }),
          catchError((error) => {
            if (error.status === 0 || error.status === 429) {
              return timer(5000).pipe(
                mergeMap(() => of(AuthActions.refreshToken()))
              );
            }
            localStorage.removeItem('authToken');
            return of(AuthActions.refreshTokenFailure({ error }));
          })
        )
      )
    )
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        switchMap(() =>
          this.tokenService.removeToken().pipe(
            tap(() => {
              console.trace();
              localStorage.removeItem('authToken');
            }),
            map(() => UserActions.clearUser()),
            catchError(() => {
              localStorage.removeItem('authToken');
              return of(UserActions.clearUser());
            })
          )
        )
      ),
    { dispatch: true }
  );
}
