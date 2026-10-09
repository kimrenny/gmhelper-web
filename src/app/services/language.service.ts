import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UserService } from './user.service';
import { LanguageCode } from '../models/languages.model';
import { Store } from '@ngrx/store';
import * as UserSelectors from '../store/user/user.selectors';
import { first } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  constructor(private translate: TranslateService, private store: Store) {}

  initializeLanguage(): void {
    this.translate.setDefaultLang('en');
    this.store
      .select(UserSelectors.selectUser)
      .pipe(first((user) => !!user))
      .subscribe((user) => {
        const language = user.language.toLowerCase();
        this.translate.use(this.isLanguageCode(language) ? language : 'en');
      });
  }

  getCurrentLanguage(): LanguageCode {
    const current = this.translate.currentLang || this.translate.defaultLang;
    if (current && this.isLanguageCode(current.toLowerCase())) {
      return current.toLowerCase() as LanguageCode;
    }
    return 'en';
  }

  updateLanguageFromUser(userLang: string): boolean {
    if (this.isLanguageCode(userLang)) {
      this.setLanguage(userLang);
      return true;
    }

    return false;
  }

  private setLanguage(lang: string): void {
    this.translate.use(lang);
  }

  isLanguageCode(code: string): code is LanguageCode {
    return ['de', 'en', 'fr', 'ja', 'ko', 'ru', 'ua', 'zh'].includes(code);
  }
}
