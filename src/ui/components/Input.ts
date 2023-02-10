import { setElementStyles } from './Element';

export type InputProps = {
  type?: string;
  value?: string;
  styles?: Partial<CSSStyleDeclaration>;
};

export function Input(props?: InputProps) {
  const input = document.createElement('input');

  input.type = props?.type || 'text';
  input.value = props?.value || '';
  setElementStyles(input, props?.styles);

  return input;
}
