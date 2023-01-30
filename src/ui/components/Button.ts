import { setElementStyles } from './Element';

type ButtonProps = {
  innerText?: string;
  innerHTML?: string;
  styles?: Partial<CSSStyleDeclaration>;
  onClick?: () => void;
};

export function Button(props?: ButtonProps) {
  const el = document.createElement('button');

  setElementStyles(el, props?.styles);

  el.innerText = props?.innerText;
  el.innerHTML = props?.innerHTML;

  if (props?.onClick) {
    el.addEventListener('click', props.onClick);
  }

  return el;
}
