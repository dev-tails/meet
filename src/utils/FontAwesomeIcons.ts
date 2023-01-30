import { library, icon } from '@fortawesome/fontawesome-svg-core';
import {
  faMicrophone,
  faMicrophoneSlash,
  faPhone,
} from '@fortawesome/free-solid-svg-icons';

library.add(faMicrophone);
library.add(faMicrophoneSlash);
library.add(faPhone);

export const microphoneIcon = icon({
  prefix: 'fas',
  iconName: 'microphone',
}).html[0];
export const microphoneSlashIcon = icon({
  prefix: 'fas',
  iconName: 'microphone-slash',
}).html[0];
export const phoneIcon = icon({ prefix: 'fas', iconName: 'phone' }).html[0];
