import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'angle-input',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './angle-input.component.html',
  styleUrls: ['./angle-input.component.scss'],
})
export class AngleInputComponent {
  @Input() initialValue: number | string = 60;
  @Output() confirm = new EventEmitter<number | null>();

  value: number | string = this.initialValue;

  ngOnChanges() {
    this.value = this.initialValue != null ? this.initialValue : 60;
  }

  setValue(val: number | string) {
    this.value = val;
  }

  decrease() {
    const num = typeof this.value === 'number' ? this.value : parseFloat(String(this.value));
    if (!isNaN(num)) {
      if (num > 1) this.value = Math.max(1, num - 1);
    } else {
      this.value = 60;
    }
  }

  increase() {
    const num = typeof this.value === 'number' ? this.value : parseFloat(String(this.value));
    if (!isNaN(num)) {
      if (num < 179) this.value = Math.min(179, num + 1);
    } else {
      this.value = 60;
    }
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.trim();

    if (!val) {
      this.value = '';
      return;
    }

    const num = parseFloat(val);
    if (!isNaN(num)) {
      this.value = Math.min(179.9, Math.max(0.1, num));
    } else {
      this.value = val;
    }
  }

  clear() {
    this.confirm.emit(null);
  }

  save() {
    if (this.value === '' || this.value == null) {
      this.confirm.emit(null);
      return;
    }
    const num = typeof this.value === 'number' ? this.value : parseFloat(String(this.value));
    if (!isNaN(num) && num > 0 && num < 180) {
      this.confirm.emit(num);
    } else {
      this.confirm.emit(null);
    }
  }
}
