import { io } from 'socket.io-client';
import Peer from 'peerjs';
import { Div, Button, Video } from '../ui/components';
import { byId, setStyle } from '../utils/DomUtils';
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

  // When we first open the app, have us join a room
  myPeer.on('open', (id) => {
    myUserId = id;
    socket.emit('join-room', roomId, myUserId);
  });

  const container = Div({ styles: { height: '100%' } });
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

  const myVideo = Video({
    muted: true,
    styles,
  });

  getUserMedia({
    video: true,
    audio: true,
  }).then((stream) => {
    addVideoStream(myVideo, stream); // Display our video to ourselves

    myStream = stream;
    // When we join someone's room we will receive a call from them
    myPeer.on('call', (call) => {
      peers.push({ userId: call });
      call.answer(myStream); // Stream them our video/audio
      const video = Video({ styles });
      video.id = call.peer;
      console.log('call metadata type', call.metadata);
      // When we recieve their stream
      call.on('stream', (userVideoStream) => {
        // Display their video to ourselves

        addVideoStream(video, userVideoStream);
        if (call.metadata) {
          userIdScreensharing = call.metadata;
        }
        adjustLayout(userIdScreensharing);
      });
    });

    // If a new user connect
    socket.on('user-connected', (userId) => {
      console.log('call new user and tell him im sharing', userIdScreensharing);
      connectToNewUser(userId, myStream);
    });
  });

  socket.on('change-layout', adjustLayout);

  socket.on('user-disconnected', (userId) => {
    const userToDisconnect = peers.find((peer) => peer.userId?.peer === userId);
    userToDisconnect?.userId.close();
    const videoRemoved = byId(userToDisconnect.userId.peer);
    videoRemoved?.remove();
  });

  function addVideoStream(video: HTMLVideoElement, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      // Play the video as it loads
      video.play();
    });

    el.append(video);
  }

  // This runs when someone joins our room
  function connectToNewUser(userId, stream) {
    if (stream.getAudioTracks().length) {
      stream.getAudioTracks()[0].enabled = !isSelfMuted;
    }
    // Call the user who just joined
    const call = myPeer.call(userId, stream, { metadata: userIdScreensharing }); // call and send our video stream
    const otherUserVideo = Video({ styles });
    otherUserVideo.id = userId;
    // Add their video
    call.on('stream', (userVideoStream) => {
      addVideoStream(otherUserVideo, userVideoStream);
    });

    // If they leave, remove their video
    call.on('close', () => {
      otherUserVideo.remove();
    });
    peers.push({ userId: call });
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
    if (!!userScreensharing) {
      const screensharingCapture = byId(userScreensharing);
      screensharingCapture.style.transform = 'rotateY(0deg)';
      screensharingCapture.style.objectFit = 'contain';
      byId('videos').style.width = '16%';
      byId('videos').style.flexDirection = 'column';
      container.style.display = 'flex';
      Array.from(el.children).forEach((child) => {
        (child as HTMLElement).style.height = 'fit-content';
        (child as HTMLElement).style.width = '100%';
      });
      screensharingCapture.style.width = '84%';
      container.prepend(screensharingCapture);
      console.log('AQUI');
      return;
    }
    console.log('afuera ~~~');
    const columns = getColumns();
    const videoWidth = window.innerWidth / columns;
    const rows = Math.ceil(el.children.length / columns);
    const videoHeight = window.innerHeight / rows;
    Array.from(el.children).forEach((child) => {
      (child as HTMLElement).style.height = (videoHeight - 20).toString();
      (child as HTMLElement).style.width = (videoWidth - 20).toString();
    });
  }

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
    onClick: async () => {
      const mediaStream = await getLocalScreenStream();
      if (!mediaStream) {
        return;
      }
      myStream = mediaStream;
      // To replace camera with screen share
      const [screenTrack] = mediaStream.getVideoTracks();
      userIdScreensharing = myUserId;
      peers.forEach(async (peer) => {
        const rtpSender = peer.userId.peerConnection
          .getSenders()
          .find((sender) => sender.track.kind === screenTrack.kind);
        rtpSender.replaceTrack(screenTrack);
        socket.emit('change-layout', myUserId);
      });
    },
  });

  buttons.append(shareScreenButton);
  buttons.append(muteButton);
  buttons.append(muteButton);
  buttons.append(exitCallButton);
  container.append(el);
  container.append(buttons);

  addVideocallListeners();
  return container;
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
    muteButton.innerHTML = microphoneSlashIcon;
    audioTracks.enabled = false;
  } else {
    muteButton.innerHTML = microphoneIcon;
    audioTracks.enabled = true;
  }
  isSelfMuted = !isSelfMuted;
}

function addVideocallListeners() {
  document.addEventListener('keydown', onMuteKeydownCmd);
  document.addEventListener('keyup', onMuteKeyupCmd);
}

export function removeVideocallListeners() {
  document.removeEventListener('keydown', onMuteKeydownCmd);
  document.removeEventListener('keyup', onMuteKeyupCmd);
}
