import { byId, setStyle } from '../../utils/DomUtils';
import {
  microphoneIcon,
  microphoneSlashIcon,
} from '../../utils/FontAwesomeIcons';
import { getCurrentStream } from './StreamHelpers';

export const isMac =
  (navigator as any)?.userAgentData?.platform === 'macOS' ||
  navigator.userAgent.includes('(Mac');

let isSelfMuted = false;
const shortcutKey = isMac ? 'Meta' : 'Control';
let keys = { meta: false, d: false };

function onMuteKeydownCmd(event) {
  if (event.key === shortcutKey) {
    keys.meta = true;
  }

  if (event.key === 'd') {
    keys.d = true;
  }

  if (keys.meta && keys.d) {
    event.preventDefault();
    muteSelf();
  }
}

function onMuteKeyupCmd(event) {
  if (event.key === shortcutKey) {
    keys.meta = false;
    keys.d = false;
  }

  if (event.key === 'd') {
    keys.meta = false;
    keys.d = false;
  }
}

export async function muteSelf() {
  const muteButton = byId('mute-btn') as HTMLButtonElement;
  const myStream = getCurrentStream();
  if (!myStream) return;

  const audioTracks = myStream.getAudioTracks()[0];
  const tooltip = `${audioTracks.enabled ? 'Unmute' : 'Mute'} microphone (${
    isMac ? '⌘' : 'Ctrl'
  } + d)`;
  const muteTooltip = byId('mute-tooltip');

  if (audioTracks.enabled) {
    muteButton.innerHTML = microphoneSlashIcon;
    setStyle(muteButton, { color: '#ee5447', border: '1px solid #ee5447' });
    audioTracks.enabled = false;
  } else {
    muteButton.innerHTML = microphoneIcon;
    setStyle(muteButton, { color: '#808080', border: 'none' });
    audioTracks.enabled = true;
  }

  if (muteTooltip) {
    muteTooltip.innerHTML = tooltip;
    const elementSVG = muteButton.firstElementChild as HTMLElement;
    setStyle(elementSVG, { pointerEvents: 'none' });
    setStyle(muteTooltip, { opacity: '1' });
    setTimeout(() => setStyle(muteTooltip, { opacity: '0' }), 600);
  }
  isSelfMuted = !isSelfMuted;
}

export function selfMuted() {
  return isSelfMuted;
}

export function addVideocallListeners() {
  document.addEventListener('keydown', onMuteKeydownCmd);
  document.addEventListener('keyup', onMuteKeyupCmd);
}

export function removeVideocallListeners() {
  document.removeEventListener('keydown', onMuteKeydownCmd);
  document.removeEventListener('keyup', onMuteKeyupCmd);
}
