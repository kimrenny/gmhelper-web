import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LineLength } from '../types/line-length.type';

@Component({
  selector: 'line-length-input',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './line-length-input.component.html',
  styleUrls: ['./line-length-input.component.scss'],
})
export class LineLengthInputComponent {
  @Input() initialValue: LineLength = '?';
  @Output() confirm = new EventEmitter<LineLength>();

  value: LineLength = this.initialValue;

  ngOnChanges() {
    this.value = this.initialValue;
  }

  setValue(value: LineLength) {
    this.value = value;
  }

  decrease() {
    if (
      !this.value ||
      this.value === 'x' ||
      this.value === 'y' ||
      this.value === '?'
    ) {
      this.value = 1;
    } else {
      const num = Number(this.value);
      if (!isNaN(num) && num > 1) {
        this.value = num - 1;
      }
    }
  }

  increase() {
    if (
      !this.value ||
      this.value === 'x' ||
      this.value === 'y' ||
      this.value === '?'
    ) {
      this.value = 1;
    } else {
      const num = Number(this.value);
      if (!isNaN(num)) {
        this.value = num + 1;
      }
    }
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.trim();

    if (!val) {
      this.value = null;
      return;
    }

    if (val === 'x' || val === 'y' || val === '?') {
      this.value = val;
      return;
    }

    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      this.value = num;
    } else {
      this.value = null;
    }
  }

  clear() {
    this.confirm.emit(null);
  }

  save() {
    this.confirm.emit(this.value);
  }
}
