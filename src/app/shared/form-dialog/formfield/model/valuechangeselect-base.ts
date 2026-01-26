import { SelectBase } from './select-base';

export class ValueChangeSelectBase extends SelectBase {
  controlType = 'select';
  onValueChange?: (value: any) => void;

  constructor(options: {} = {}) {
    super(options);
	this.onValueChange = options['onValueChange']; 
  }
}
