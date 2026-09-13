import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { Store } from '@ngrx/store';
import { TokenService } from 'src/app/services/token.service';
import { HeaderService } from 'src/app/services/header.service';
import { LanguageService } from 'src/app/services/language.service';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationService } from 'src/app/services/navigation.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as UserSelectors from 'src/app/store/user/user.selectors';
import * as AuthSelectors from 'src/app/store/auth/auth.selectors';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  let mockTokenService: jasmine.SpyObj<TokenService>;
  let mockHeaderService: any;
  let mockLanguageService: any;
  let mockNavigationService: any;
  let mockToastrService: any;
  let mockRouter: any;

  let isAuthorized$: BehaviorSubject<boolean>;
  let userDetails$: BehaviorSubject<any>;
  let isLoading$: BehaviorSubject<boolean>;
  let accessToken$: BehaviorSubject<string | null>;

  let mockStore: any;

  const createMessageEvent = (data: any, origin: string, source: any): MessageEvent => {
    const event = new MessageEvent('message', {
      data,
      origin,
    });
    Object.defineProperty(event, 'source', {
      value: source,
      configurable: true,
      writable: true,
    });
    return event;
  };

  beforeEach(async () => {
    isAuthorized$ = new BehaviorSubject<boolean>(false);
    userDetails$ = new BehaviorSubject<any>({
      nickname: 'TestUser',
      avatar: '',
    });
    isLoading$ = new BehaviorSubject<boolean>(false);
    accessToken$ = new BehaviorSubject<string | null>(null);

    mockTokenService = jasmine.createSpyObj<TokenService>('TokenService', [
      'extractUserRole',
      'getToken$',
    ]);
    mockHeaderService = { showAuthHighlight$: of(false) };
    mockLanguageService = {
      updateLanguageFromUser: jasmine.createSpy('updateLanguageFromUser'),
    };
    mockNavigationService = {
      scrollToSection: jasmine.createSpy('scrollToSection'),
    };
    mockToastrService = { info: jasmine.createSpy('info') };
    mockRouter = {
      events: of(),
      navigate: jasmine.createSpy('navigate'),
    };

    mockStore = {
      select: jasmine.createSpy('select').and.callFake((selector: any) => {
        if (selector === UserSelectors.selectIsAuthorized) {
          return isAuthorized$;
        }
        if (selector === UserSelectors.selectUser) {
          return userDetails$;
        }
        if (selector === UserSelectors.selectIsUserLoading) {
          return isLoading$;
        }
        if (selector === AuthSelectors.selectAccessToken) {
          return accessToken$;
        }
        return of(null);
      }),
      dispatch: jasmine.createSpy('dispatch'),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent, TranslateModule.forRoot()],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: TokenService, useValue: mockTokenService },
        { provide: HeaderService, useValue: mockHeaderService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show Notifications menu item when user is Admin', () => {
    isAuthorized$.next(true);
    accessToken$.next('valid-admin-token');
    mockTokenService.extractUserRole.and.returnValue('Admin');

    fixture.detectChanges();
    component.showUserMenu = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const menuItems = Array.from(
      compiled.querySelectorAll('.user-menu-list li')
    ).map((li) => li.textContent?.trim());

    expect(component.checkAdminAccess()).toBeTrue();
    expect(menuItems).toContain('HEADER.LIST.NOTIFICATIONS');
  });

  it('should show Notifications menu item when user is Owner', () => {
    isAuthorized$.next(true);
    accessToken$.next('valid-owner-token');
    mockTokenService.extractUserRole.and.returnValue('Owner');

    fixture.detectChanges();
    component.showUserMenu = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const menuItems = Array.from(
      compiled.querySelectorAll('.user-menu-list li')
    ).map((li) => li.textContent?.trim());

    expect(component.checkAdminAccess()).toBeTrue();
    expect(menuItems).toContain('HEADER.LIST.NOTIFICATIONS');
  });

  it('should NOT show Notifications menu item when user is regular User', () => {
    isAuthorized$.next(true);
    accessToken$.next('valid-user-token');
    mockTokenService.extractUserRole.and.returnValue('User');

    fixture.detectChanges();
    component.showUserMenu = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const menuItems = Array.from(
      compiled.querySelectorAll('.user-menu-list li')
    ).map((li) => li.textContent?.trim());

    expect(component.checkAdminAccess()).toBeFalse();
    expect(menuItems).not.toContain('HEADER.LIST.NOTIFICATIONS');
  });

  it('should NOT show Notifications menu item when user is unauthenticated', () => {
    isAuthorized$.next(false);
    accessToken$.next(null);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const menuList = compiled.querySelector('.user-menu-list');

    expect(component.checkAdminAccess()).toBeFalse();
    expect(menuList).toBeNull();
  });

  describe('openNotifications() and postMessage handshake', () => {
    let mockOpenedWindow: any;

    beforeEach(() => {
      isAuthorized$.next(true);
      accessToken$.next('valid-admin-token');
      mockTokenService.extractUserRole.and.returnValue('Admin');
      fixture.detectChanges();

      mockOpenedWindow = {
        postMessage: jasmine.createSpy('postMessage'),
      };
      spyOn(window, 'open').and.returnValue(mockOpenedWindow as any);
    });

    it('should open the configured notification URL in a new tab without tokens in the URL', () => {
      component.openNotifications();

      expect(window.open).toHaveBeenCalledWith(
        environment.notifyWebUrl,
        '_blank'
      );
      const urlArg = (window.open as jasmine.Spy).calls.mostRecent().args[0];
      expect(urlArg).not.toContain('token');
      expect(urlArg).not.toContain('jwt');
      expect(urlArg).not.toContain('Bearer');
    });

    it('should securely respond with human JWT when a valid handshake request is received', () => {
      const humanJwt = 'human-jwt-sample-access-token';
      mockTokenService.getToken$.and.returnValue(of(humanJwt));

      component.openNotifications();

      const trustedOrigin = new URL(environment.notifyWebUrl).origin;
      const messageEvent = createMessageEvent(
        { type: 'GMHELPER_NOTIFY_AUTH_REQUEST' },
        trustedOrigin,
        mockOpenedWindow
      );

      window.dispatchEvent(messageEvent);

      expect(mockTokenService.getToken$).toHaveBeenCalled();
      expect(mockOpenedWindow.postMessage).toHaveBeenCalledWith(
        {
          type: 'GMHELPER_NOTIFY_AUTH_RESPONSE',
          token: humanJwt,
        },
        trustedOrigin
      );

      const targetOriginArg = mockOpenedWindow.postMessage.calls.mostRecent()
        .args[1];
      expect(targetOriginArg).toBe(trustedOrigin);
      expect(targetOriginArg).not.toBe('*');
    });

    it('should ignore requests from untrusted origins', () => {
      mockTokenService.getToken$.and.returnValue(of('sample-token'));

      component.openNotifications();

      const untrustedEvent = createMessageEvent(
        { type: 'GMHELPER_NOTIFY_AUTH_REQUEST' },
        'http://malicious-site.example.com',
        mockOpenedWindow
      );

      window.dispatchEvent(untrustedEvent);

      expect(mockOpenedWindow.postMessage).not.toHaveBeenCalled();
      expect(mockTokenService.getToken$).not.toHaveBeenCalled();
    });

    it('should ignore messages with an invalid or unexpected type', () => {
      mockTokenService.getToken$.and.returnValue(of('sample-token'));

      component.openNotifications();

      const trustedOrigin = new URL(environment.notifyWebUrl).origin;
      const invalidTypeEvent = createMessageEvent(
        { type: 'SOME_UNEXPECTED_MESSAGE_TYPE' },
        trustedOrigin,
        mockOpenedWindow
      );

      window.dispatchEvent(invalidTypeEvent);

      expect(mockOpenedWindow.postMessage).not.toHaveBeenCalled();
      expect(mockTokenService.getToken$).not.toHaveBeenCalled();
    });

    it('should ignore requests coming from a different window', () => {
      mockTokenService.getToken$.and.returnValue(of('sample-token'));

      component.openNotifications();

      const trustedOrigin = new URL(environment.notifyWebUrl).origin;
      const differentWindow = { postMessage: jasmine.createSpy('otherPostMessage') };
      const differentWindowEvent = createMessageEvent(
        { type: 'GMHELPER_NOTIFY_AUTH_REQUEST' },
        trustedOrigin,
        differentWindow
      );

      window.dispatchEvent(differentWindowEvent);

      expect(mockOpenedWindow.postMessage).not.toHaveBeenCalled();
      expect(mockTokenService.getToken$).not.toHaveBeenCalled();
    });

    it('should not respond if user role is not Admin/Owner', () => {
      mockTokenService.getToken$.and.returnValue(of('user-token'));
      component.userRole = 'User';

      component.openNotifications();

      expect(window.open).not.toHaveBeenCalled();
      expect(mockOpenedWindow.postMessage).not.toHaveBeenCalled();
    });

    it('should remove existing message listener before registering a new one', () => {
      const removeListenerSpy = spyOn(
        window,
        'removeEventListener'
      ).and.callThrough();

      component.openNotifications();
      expect(removeListenerSpy).not.toHaveBeenCalledWith(
        'message',
        jasmine.any(Function)
      );

      // Open a second time
      component.openNotifications();
      expect(removeListenerSpy).toHaveBeenCalledWith(
        'message',
        jasmine.any(Function)
      );
    });

    it('should remove message listener on component destruction', () => {
      const removeListenerSpy = spyOn(
        window,
        'removeEventListener'
      ).and.callThrough();

      component.openNotifications();
      fixture.destroy();

      expect(removeListenerSpy).toHaveBeenCalledWith(
        'message',
        jasmine.any(Function)
      );
    });
  });
});
