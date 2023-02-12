import { Div } from '../../ui/components';

let currentStream: MediaStream;

export async function getLocalUserMedia() {
  const getUserMedia =
    navigator?.mediaDevices?.getUserMedia ||
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia;

  try {
    const stream = await getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        suppressLocalAudioPlayback: true,
      },
    });
    currentStream = stream;
    return stream;
  } catch (error) {
    console.error('Failed to access local user media', error);
  }
}

export function getCurrentStream() {
  return currentStream;
}

export async function getLocalScreenStream() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'window',
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        suppressLocalAudioPlayback: true,
      },
      surfaceSwitching: 'include',
      selfBrowserSurface: 'exclude',
      systemAudio: 'exclude',
    } as any);

    return screenStream;
  } catch (error) {
    console.error('Failed to get local screen', error);
  }
}

export function mediaAccessBlocked() {
  const noUserMedia = Div({
    innerHTML: 'Access to microphone and camera needed.',
  });
  return noUserMedia;
}
