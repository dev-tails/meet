import { setElementStyles } from './Element';

export type InputProps = {
  type?: string;
  value?: string;
  placeholder?: string;
  onfocus?: () => void;
  onfocusout?: () => void;
  styles?: Partial<CSSStyleDeclaration>;
};

export function Input(props?: InputProps) {
  const input = document.createElement('input');

  input.type = props?.type || 'text';
  input.value = props?.value || '';
  input.placeholder = props?.placeholder || '';

  if (props?.onfocus) {
    input.addEventListener('focus', () => {
      props.onfocus?.();
    });
  }
  if (props?.onfocusout) {
    input.addEventListener('focusout', () => {
      props.onfocusout?.();
    });
  }
  setElementStyles(input, props?.styles);

  return input;
}
