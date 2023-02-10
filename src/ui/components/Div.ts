import { setElementStyles } from './Element';

export function Div(params?: {
  id?: string;
  class?: string;
  styles?: Partial<CSSStyleDeclaration>;
  innerHTML?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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

  if (params?.onMouseEnter) {
    el.addEventListener('mouseenter', params.onMouseEnter, true);
  }
  if (params?.onMouseLeave) {
    el.addEventListener('mouseleave', params.onMouseLeave, true);
  }

  if (params?.id) {
    el.id = params.id;
  }

  if (params?.class) {
    el.className = params.class;
  }

  return el;
}
