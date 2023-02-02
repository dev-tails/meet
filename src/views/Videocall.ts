import { io } from 'socket.io-client';
import Peer from 'peerjs';
import { Div, Button, Video } from '../ui/components';
import { byId } from '../utils/DomUtils';
import { setURL } from '../utils/HistoryUtils';
import {
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
  backgroundColor: '#7b98d8',
  border: 'none',
  borderRadius: '50%',
  fontSize: '18px',
  color: '#fff',
  cursor: 'pointer',
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

export function Videocall() {
  const roomId = window.location.pathname.split('/')[1];
  const myPeer = new Peer();
  let muteButtonHovered = false;

  // When we first open the app, have us join a room
  myPeer.on('open', (id) => {
    socket.emit('join-room', roomId, id);
  });

  const container = Div();
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
      console.log('what is my Stream video', myStream);
      call.answer(myStream); // Stream them our video/audio
      const video = Video({ styles });
      video.id = call.peer;
      // When we recieve their stream
      call.on('stream', (userVideoStream) => {
        // Display their video to ourselves
        addVideoStream(video, userVideoStream);
      });
    });

    // If a new user connect
    socket.on('user-connected', (userId) => {
      console.log('NEW USER');
      setTimeout(() => connectToNewUser(userId, myStream), 1000);
    });
  });

  socket.on('change-layout', () => adjustLayout(true));

  socket.on('user-disconnected', (userId) => {
    const userToDisconnect = peers.find((peer) => peer.userId?.peer === userId);
    userToDisconnect?.userId.close();
    const videoRemoved = byId(userToDisconnect.userId.peer);
    videoRemoved?.remove();
  });

  function addVideoStream(video: HTMLVideoElement, stream) {
    console.log('coming', stream);
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      // Play the video as it loads
      video.play();
    });
    // if (video.id && byId(video.id)) {
    //   video.style.transform = 'rotateY(0deg)';
    // }

    if (el.children.length) {
      adjustLayout();
    }

    el.append(video);
  }

  // This runs when someone joins our room
  function connectToNewUser(userId, stream) {
    console.log('comming stream', userId, stream.getVideoTracks());
    if (stream.getAudioTracks().length) {
      stream.getAudioTracks()[0].enabled = !isSelfMuted;
    }
    // Call the user who just joined
    const call = myPeer.call(userId, stream); // call and send our video stream
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

  function adjustLayout(isSreenshareActive?: boolean) {
    if (isSreenshareActive) {
      Array.from(el.children).forEach((child) => {
        (child as HTMLElement).style.height = '200px';
        (child as HTMLElement).style.width = '200px';
      });
      return;

      //   video.style.transform = 'rotateY(0deg)';
    }
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
    innerHTML: phoneIcon,
    styles: {
      ...buttonStyles,
      right: '20px',
      backgroundColor: '#d73030',
      transform: 'rotate(137deg)',
      marginLeft: '12px',
    },
    onClick: () => {
      socket.close();
      removeVideocallListeners();
      setURL('/');
    },
  });

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
    innerHTML: microphoneIcon,
    styles: buttonStyles,
    onClick: muteSelf,
    onMouseEnter: () => {
      muteButtonHovered = true;
      muteButton.style.backgroundColor = '#6485cd';
      muteTextTooltip.style.opacity = '1';
      muteButton.append(muteTextTooltip);
    },
    onMouseLeave: () => {
      muteButton.style.backgroundColor = '#7b98d8';
      muteButtonHovered = false;
      !muteButtonHovered &&
        setTimeout(() => {
          muteTextTooltip.style.opacity = '0';
        }, 200);
    },
  });

  const shareScreenButton = Button({
    innerHTML: 'SHARE',
    styles: buttonStyles,
    onClick: async () => {
      const mediaStream = await getLocalScreenStream();
      if (!mediaStream) {
        return;
      }
      myStream = mediaStream;
      // To replace camera with screen share
      const [screenTrack] = mediaStream.getVideoTracks();
      console.log('oeers', peers);
      peers.forEach(async (peer) => {
        const sender = peer.userId.peerConnection
          .getSenders()
          .find((s) => s.track.kind === screenTrack.kind);
        console.log('sender', peer, sender);
        sender.replaceTrack(screenTrack);
        adjustLayout();
        socket.emit('change-layout', 'hola');
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
      video: true,
      audio: false,
    });

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
