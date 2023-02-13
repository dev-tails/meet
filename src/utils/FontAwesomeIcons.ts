import { library, icon } from '@fortawesome/fontawesome-svg-core';
import {
  faCopy,
  faDesktop,
  faMicrophone,
  faMicrophoneSlash,
  faPhone,
  faWandSparkles,
} from '@fortawesome/free-solid-svg-icons';

library.add(faCopy);
library.add(faDesktop);
library.add(faMicrophone);
library.add(faMicrophoneSlash);
library.add(faPhone);
library.add(faWandSparkles);

export const copyIcon = icon({ prefix: 'fas', iconName: 'copy' }).html[0];
export const desktopIcon = icon({ prefix: 'fas', iconName: 'desktop' }).html[0];
export const microphoneIcon = icon({
  prefix: 'fas',
  iconName: 'microphone',
}).html[0];
export const microphoneSlashIcon = icon({
  prefix: 'fas',
  iconName: 'microphone-slash',
}).html[0];
export const phoneIcon = icon({ prefix: 'fas', iconName: 'phone' }).html[0];
export const wandSparklesIcon = icon({
  prefix: 'fas',
  iconName: 'wand-sparkles',
}).html[0];
