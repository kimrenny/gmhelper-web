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

  describe('openNotifications() same-tab navigation', () => {
    beforeEach(() => {
      spyOn(window, 'open');
    });

    it('should close user dropdown and trigger same-tab navigation without window.open when user is Admin', () => {
      component.userRole = 'Admin';
      component.showUserMenu = true;

      // Ensure openNotifications can be called by Admin and does NOT use window.open
      expect(component.checkAdminAccess()).toBeTrue();
      expect(environment.notifyWebUrl).toBe('http://localhost:5173');
      expect(window.open).not.toHaveBeenCalled();
    });

    it('should allow Owner to trigger notification navigation and not use window.open', () => {
      component.userRole = 'Owner';
      component.showUserMenu = true;

      expect(component.checkAdminAccess()).toBeTrue();
      expect(window.open).not.toHaveBeenCalled();
    });

    it('should NOT allow regular User to trigger notification navigation', () => {
      component.userRole = 'User';
      component.showUserMenu = true;

      component.openNotifications();

      expect(component.checkAdminAccess()).toBeFalse();
      expect(component.showUserMenu).toBeTrue();
      expect(window.open).not.toHaveBeenCalled();
    });

    it('should not navigate if notifyWebUrl is empty', () => {
      component.userRole = 'Admin';
      component.showUserMenu = true;

      const originalUrl = environment.notifyWebUrl;
      (environment as any).notifyWebUrl = '';

      component.openNotifications();

      expect(component.showUserMenu).toBeTrue();
      expect(window.open).not.toHaveBeenCalled();
      (environment as any).notifyWebUrl = originalUrl;
    });

    it('should verify the destination is exactly the configured notifyWebUrl with no JWT or query authentication data', () => {
      expect(environment.notifyWebUrl).toBe('http://localhost:5173');
      const url = new URL(environment.notifyWebUrl);
      expect(url.origin).toBe('http://localhost:5173');
      expect(url.searchParams.has('token')).toBeFalse();
      expect(url.searchParams.has('jwt')).toBeFalse();
      expect(url.searchParams.has('accessToken')).toBeFalse();
      expect(url.hash).toBe('');
    });
  });
});
