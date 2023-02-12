import { Button, Div } from '../../ui/components';
import { byId, setStyle } from '../../utils/DomUtils';
import {
  desktopIcon,
  microphoneIcon,
  phoneIcon,
} from '../../utils/FontAwesomeIcons';
import { isMac, muteSelf } from './MuteShortcuts';

const buttonStyles = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '40px',
  width: '40px',
  backgroundColor: '#fff',
  borderRadius: '50%',
  fontSize: '18px',
  color: '#808080',
  cursor: 'pointer',
  outline: 'none',
  // boxShadow: '0px 2px 6px 1px rgba(0, 0, 0, 0.2)',
};

export function ActionButtons(
  onSharecaptureClick: () => void,
  onExitCallClick: () => void
) {
  const buttons = Div({
    class: 'buttons-container',
    styles: {
      height: '56px',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      position: 'fixed',
      bottom: '12px',
      zIndex: '1',
    },
  });

  const shareScreenButton = Button({
    class: 'action-buttons',
    innerHTML: desktopIcon,
    styles: buttonStyles,
    onClick: onSharecaptureClick,
    onMouseEnter: () =>
      setStyle(byId('share-tooltip') as HTMLDivElement, { opacity: '1' }),
    onMouseLeave: () =>
      setTimeout(
        () =>
          setStyle(byId('share-tooltip') as HTMLDivElement, { opacity: '0' }),
        200
      ),
  });
  const shareScreenEl = buttonAndTooltip(
    'share',
    'Start screenshare',
    shareScreenButton
  );

  const muteButton = Button({
    id: 'mute-btn',
    class: 'action-buttons',
    innerHTML: microphoneIcon,
    styles: { ...buttonStyles, margin: '0 24px' },
    onClick: muteSelf,
    onMouseEnter: () =>
      setStyle(byId('mute-tooltip') as HTMLDivElement, { opacity: '1' }),
    onMouseLeave: () =>
      setTimeout(
        () =>
          setStyle(byId('mute-tooltip') as HTMLDivElement, { opacity: '0' }),
        200
      ),
  });

  const muteEl = buttonAndTooltip(
    'mute',
    `Mute microphone (${isMac ? '⌘' : 'Ctrl'} + d)`,
    muteButton
  );

  const exitCallButton = Button({
    class: 'action-buttons',
    innerHTML: phoneIcon,
    styles: {
      width: '60px',
      height: '40px',
      borderRadius: '20px',
      fontSize: '20px',
      cursor: 'pointer',
      backgroundColor: '#d73030',
      color: '#fff',
      border: 'none',
    },
    onClick: onExitCallClick,
    onMouseEnter: () =>
      setStyle(byId('end-tooltip') as HTMLDivElement, { opacity: '1' }),
    onMouseLeave: () =>
      setTimeout(
        () => setStyle(byId('end-tooltip') as HTMLDivElement, { opacity: '0' }),
        200
      ),
  });
  const exitCallEl = buttonAndTooltip('end', 'End call', exitCallButton);

  const exitCallSVG = exitCallButton.firstElementChild as HTMLElement;
  setStyle(exitCallSVG, { transform: 'rotate(137deg)' });

  buttons.append(shareScreenEl);
  buttons.append(muteEl);
  buttons.append(exitCallEl);
  return buttons;
}

function buttonAndTooltip(
  id: 'share' | 'mute' | 'end',
  tooltipText: string,
  element: any
) {
  const wrapper = Div({
    id: `${id}-button`,
    styles: { position: 'relative', display: 'flex', alignItems: 'center' },
  });
  const tooltip = Div({
    id: `${id}-tooltip`,
    class: 'tooltip',
    innerHTML: tooltipText,
    styles: {
      background: '#5b67da',
      color: '#fff',
      width: 'max-content',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '14px',
      position: 'absolute',
      transform: `translate(${
        id === 'mute' ? '-26' : id === 'end' ? '-12' : '-34'
      }%, -52px)`,
      opacity: '0',
      transition: 'opacity .5s',
      fontFamily: 'Raleway, sans-serif',
      outline: 'none',
    },
  });

  wrapper.append(element);
  const elementSVG = element.firstElementChild as HTMLElement;
  setStyle(elementSVG, { pointerEvents: 'none' });
  wrapper.append(tooltip);
  return wrapper;
}
