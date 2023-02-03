import { setElementStyles } from './Element';

type ButtonProps = {
  id?: string;
  class?: string;
  innerText?: string;
  innerHTML?: string;
  styles?: Partial<CSSStyleDeclaration>;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export function Button(props?: ButtonProps) {
  const el = document.createElement('button');

  setElementStyles(el, props?.styles);

  // TODO: fix these
  el.innerText = props?.innerText;
  el.innerHTML = props?.innerHTML;

  if (props?.onClick) {
    el.addEventListener('click', props.onClick, true);
  }

  if (props?.onMouseEnter) {
    el.addEventListener('mouseenter', props.onMouseEnter, true);
  }
  if (props?.onMouseLeave) {
    el.addEventListener('mouseleave', props.onMouseLeave, true);
  }
  if (props?.id) {
    el.id = props.id;
  }

  if (props?.class) {
    el.className = props.class;
  }

  return el as HTMLButtonElement;
}
