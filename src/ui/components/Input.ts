import { setElementStyles } from './Element';

export type InputProps = {
  type?: string;
  value?: string;
  placeholder?: string;
  styles?: Partial<CSSStyleDeclaration>;
};

export function Input(props?: InputProps) {
  const input = document.createElement('input');

  input.type = props?.type || 'text';
  input.value = props?.value || '';
  input.placeholder = props?.placeholder || '';

  setElementStyles(input, props?.styles);

  return input;
}
