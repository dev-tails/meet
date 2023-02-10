import { setElementStyles } from './Element';

export function Div(params?: {
  id?: string;
  class?: string;
  styles?: Partial<CSSStyleDeclaration>;
  innerHTML?: string;
  onClick?: () => void;
}) {
  const el = document.createElement('div');

  setElementStyles(el, params?.styles);

  if (params?.innerHTML) {
    el.innerHTML = params.innerHTML;
  }

  if (params?.onClick) {
    el.addEventListener('click', () => {
      params.onClick();
    });
  }

  if (params?.id) {
    el.id = params.id;
  }

  if (params?.class) {
    el.className = params.class;
  }

  return el;
}
