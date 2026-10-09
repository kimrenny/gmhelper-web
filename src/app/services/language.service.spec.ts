import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import * as UserSelectors from '../store/user/user.selectors';

describe('LanguageService', () => {
  let service: LanguageService;
  let translate: TranslateService;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        LanguageService,
        provideMockStore({
          selectors: [
            {
              selector: UserSelectors.selectUser,
              value: { language: 'ru' },
            },
          ],
        }),
      ],
    });

    service = TestBed.inject(LanguageService);
    translate = TestBed.inject(TranslateService);
    store = TestBed.inject(MockStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return default language "en" if currentLang is not set', () => {
    expect(service.getCurrentLanguage()).toBe('en');
  });

  it('should return current language when set to valid language codes', () => {
    const supportedCodes = ['de', 'en', 'fr', 'ja', 'ko', 'ru', 'ua', 'zh'] as const;

    for (const code of supportedCodes) {
      service.updateLanguageFromUser(code);
      expect(service.getCurrentLanguage()).toBe(code);
    }
  });

  it('should validate supported language codes correctly', () => {
    expect(service.isLanguageCode('en')).toBeTrue();
    expect(service.isLanguageCode('ua')).toBeTrue();
    expect(service.isLanguageCode('ru')).toBeTrue();
    expect(service.isLanguageCode('de')).toBeTrue();
    expect(service.isLanguageCode('fr')).toBeTrue();
    expect(service.isLanguageCode('ja')).toBeTrue();
    expect(service.isLanguageCode('ko')).toBeTrue();
    expect(service.isLanguageCode('zh')).toBeTrue();

    expect(service.isLanguageCode('invalid')).toBeFalse();
    expect(service.isLanguageCode('')).toBeFalse();
  });

  it('should reject invalid language code on updateLanguageFromUser', () => {
    const updated = service.updateLanguageFromUser('invalid');
    expect(updated).toBeFalse();
  });

  it('should initialize language from user store', () => {
    service.initializeLanguage();
    expect(service.getCurrentLanguage()).toBe('ru');
  });
});
