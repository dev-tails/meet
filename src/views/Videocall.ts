import { io } from 'socket.io-client';
import Peer from 'peerjs';
import { Div, Button, Video } from '../ui/components';
import { byId } from '../utils/DomUtils';
import { setURL } from '../utils/HistoryUtils';
import {
  desktopIcon,
  microphoneIcon,
  microphoneSlashIcon,
  phoneIcon,
} from '../utils/FontAwesomeIcons';
const socket = io();

const styles = {
  height: '100%',
  width: '100%',
  objectFit: 'cover',
  borderRadius: '8px',
  padding: '4px',
  transform: 'rotateY(180deg)',
  '-webkit-transform': 'rotateY(180deg)',
  '-moz-transform': 'rotateY(180deg)',
};

const buttonStyles = {
  height: '40px',
  width: '40px',
  backgroundColor: '#3760bb',
  borderRadius: '50%',
  fontSize: '18px',
  color: '#fff',
  cursor: 'pointer',
  boxShadow: '0px 2px 6px 1px rgba(0, 0, 0, 0.2)',
};

const getUserMedia =
  navigator?.mediaDevices?.getUserMedia ||
  (navigator as any).getUserMedia ||
  (navigator as any).webkitGetUserMedia ||
  (navigator as any).mozGetUserMedia;

const isMac =
  (navigator as any)?.userAgentData?.platform === 'macOS' ||
  navigator.userAgent.includes('(Mac');

const shortcutKey = isMac ? 'Meta' : 'Control';
let keys = { meta: false, d: false };
const peers: any = [];
let myStream: any = null;
let isSelfMuted = false;
let myUserId = '';
let userIdScreensharing = '';

export function Videocall() {
  const roomId = window.location.pathname.split('/')[1];
  const myPeer = new Peer();
  let muteButtonHovered = false;

  const myVideo = Video({
    muted: true,
    styles,
  });

  myPeer.on('open', (id) => {
    myUserId = id;
    socket.emit('join-room', roomId, myUserId);
    myVideo.id = myUserId;
  });

  const view = Div();
  const el = Div({
    id: 'videos',
    styles: {
      height: '100%',
      padding: '8px',
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignContent: 'center',
    },
  });

  async function init() {
    const stream = await getLocalUserMedia();
    if (!stream) {
      const noUserMedia = Div({
        innerText: 'Access to microphone and camera needed.',
      });
      view.append(noUserMedia);
      return view;
    }

    addVideoStream(myVideo, stream); /* Display our video to ourselves */
    myStream = stream;

    myPeer.on('call', (call) => {
      peers.push({ userId: call });
      call.answer(myStream); /* Stream them our video/audio */
      const video = Video({ styles });
      video.id = call.peer;
      console.log('call metadata', call.metadata);
      /* When we receive their stream */
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
        if (call.metadata) {
          userIdScreensharing = call.metadata;
        }
        adjustLayout(userIdScreensharing);
      });
    });

    socket.on('user-connected', (userId) => {
      console.log(
        'call new user and tell this is sharing',
        userIdScreensharing
      );
      connectToNewUser(userId, myStream);
    });

    socket.on('change-layout', adjustLayout);

    socket.on('user-disconnected', (userId: string) => {
      const userToDisconnect = peers.find(
        (peer) => peer.userId?.peer === userId
      );
      userToDisconnect?.userId.close();
      const videoRemoved = byId(userToDisconnect.userId.peer);
      videoRemoved?.remove();
    });

    const buttons = Div({
      styles: {
        width: '100%',
        display: 'flex',
        position: 'fixed',
        bottom: '40px',
        justifyContent: 'center',
      },
    });

    const exitCallButton = Button({
      class: 'action-buttons',
      innerHTML: phoneIcon,
      styles: {
        ...buttonStyles,
        right: '20px',
        backgroundColor: '#d73030',
        marginLeft: '12px',
      },
      onClick: () => {
        socket.close();
        removeVideocallListeners();
        setURL('/');
      },
    });

    const rotatedIcon = exitCallButton.firstChild as SVGAElement;
    rotatedIcon.style.transform = 'rotate(137deg)';

    const muteTextTooltip = Div({
      innerText: `Mute/Unmute (${isMac ? '⌘' : 'Ctrl'} + d)`,
      styles: {
        background: '#636363',
        width: 'max-content',
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        position: 'absolute',
        transform: ' translate(-45%, 20px)',
        opacity: '0',
        transition: 'opacity 1s',
      },
    });

    const muteButton = Button({
      id: 'mute-btn',
      class: 'action-buttons',
      innerHTML: microphoneIcon,
      styles: { ...buttonStyles, marginLeft: '12px' },
      onClick: muteSelf,
      onMouseEnter: () => {
        muteButtonHovered = true;
        muteTextTooltip.style.opacity = '1';
        muteButton.append(muteTextTooltip);
      },
      onMouseLeave: () => {
        muteButtonHovered = false;
        !muteButtonHovered &&
          setTimeout(() => {
            muteTextTooltip.style.opacity = '0';
          }, 200);
      },
    });

    const shareScreenButton = Button({
      class: 'action-buttons',
      innerHTML: desktopIcon,
      styles: buttonStyles,
      onClick: startScreenshare,
    });

    function addVideoStream(video: HTMLVideoElement, stream: MediaStream) {
      video.srcObject = stream;
      video.addEventListener('loadedmetadata', () => video.play());
      el.append(video);
    }

    /* When someone joins our room */
    function connectToNewUser(userId: string, stream: MediaStream) {
      if (stream.getAudioTracks().length) {
        stream.getAudioTracks()[0].enabled = !isSelfMuted;
      }
      /* Call and send our video stream to the user who just joined */
      const call = myPeer.call(userId, stream, {
        metadata: userIdScreensharing,
      });
      const otherUserVideo = Video({ styles });
      otherUserVideo.id = userId;

      /* Add their video */
      call.on('stream', (userVideoStream) => {
        addVideoStream(otherUserVideo, userVideoStream);
        adjustLayout(userIdScreensharing);
      });

      call.on('close', () => otherUserVideo.remove());
      peers.push({ userId: call });
    }

    async function startScreenshare() {
      const mediaStream = await getLocalScreenStream();
      if (!mediaStream) {
        return;
      }

      myStream = mediaStream;
      userIdScreensharing = myUserId;

      const [screenTrack] = mediaStream.getVideoTracks();
      peers.forEach((peer) => {
        const rtpSender = peer.userId.peerConnection
          .getSenders()
          .find((sender) => sender.track.kind === screenTrack.kind);
        rtpSender.replaceTrack(screenTrack);
        socket.emit('change-layout', myUserId);
      });

      const myVideo = byId(myUserId) as HTMLVideoElement;
      if (myVideo) {
        myVideo.srcObject = mediaStream;
        myVideo.play();
        adjustLayout(myUserId);
      }
    }

    function getColumns() {
      let col = 0;
      if (el.childElementCount === 1) {
        col = 1;
      } else if (el.childElementCount > 1 && el.childElementCount <= 4) {
        col = 2;
      } else if (el.childElementCount > 4 && el.childElementCount <= 9) {
        col = 3;
      } else if (el.childElementCount > 9) {
        col = 4;
      }
      return col;
    }

    function adjustLayout(userScreensharing?: any) {
      console.log('id of screen sharing user', userScreensharing);
      const screensharingCapture = byId(userScreensharing);

      screensharingCapture
        ? screenshareLayout(screensharingCapture as HTMLVideoElement)
        : regularLayout();
    }

    function regularLayout() {
      const columns = getColumns();
      const videoWidth = window.innerWidth / columns;
      const rows = Math.ceil(el.children.length / columns);
      const videoHeight = window.innerHeight / rows;
      const widthStr = (videoWidth - 20).toString();
      const heightStr = (videoHeight - 20).toString();
      updateChildrenMeasurements(el, widthStr, heightStr);
    }

    function screenshareLayout(screencaptureEl: HTMLVideoElement) {
      screencaptureEl.style.transform = 'rotateY(0deg)';
      screencaptureEl.style.objectFit = 'contain';
      el.style.width = '16%';
      el.style.flexDirection = 'column';
      view.style.display = 'flex';
      screencaptureEl.style.width = '84%';
      updateChildrenMeasurements(el, '84%', 'fit-content');
      view.prepend(screencaptureEl);
    }

    buttons.append(shareScreenButton);
    buttons.append(muteButton);
    buttons.append(muteButton);
    buttons.append(exitCallButton);
    view.append(el);
    view.append(buttons);

    addVideocallListeners();
  }

  init();
  return view;
}

async function getLocalUserMedia() {
  try {
    const stream = await getUserMedia({
      video: true,
      audio: true,
    });
    return stream;
  } catch (error) {
    console.error('Failed to access local user media', error);
  }
}
async function getLocalScreenStream() {
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

function onMuteKeydownCmd(event) {
  if (event.key === shortcutKey) {
    keys.meta = true;
  }

  if (event.key === 'd') {
    keys.d = true;
  }

  if ((keys.meta && keys.d) || (!keys.meta && keys.d)) {
    event.preventDefault();
    muteSelf();
  }
}

function onMuteKeyupCmd(event) {
  if (event.key === shortcutKey || event.key === 'd') {
    keys.meta = false;
    keys.d = false;
  }
}

function muteSelf() {
  const muteButton = byId('mute-btn');
  const audioTracks = myStream.getAudioTracks()[0];

  if (audioTracks.enabled) {
    muteButton && (muteButton.innerHTML = microphoneSlashIcon);
    audioTracks.enabled = false;
  } else {
    muteButton && (muteButton.innerHTML = microphoneIcon);
    audioTracks.enabled = true;
  }
  isSelfMuted = !isSelfMuted;
}

function updateChildrenMeasurements(
  element: HTMLElement,
  width: string,
  height: string
) {
  Array.from(element.children).forEach((child) => {
    (child as HTMLElement).style.height = height;
    (child as HTMLElement).style.width = width;
  });
}

function addVideocallListeners() {
  document.addEventListener('keydown', onMuteKeydownCmd);
  document.addEventListener('keyup', onMuteKeyupCmd);
}

export function removeVideocallListeners() {
  document.removeEventListener('keydown', onMuteKeydownCmd);
  document.removeEventListener('keyup', onMuteKeyupCmd);
}
