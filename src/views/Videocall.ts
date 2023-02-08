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
  objectFit: 'cover',
  borderRadius: '16px',
};

const buttonStyles = {
  height: '40px',
  width: '40px',
  backgroundColor: '#fff',
  borderRadius: '50%',
  fontSize: '18px',
  color: '#808080',
  cursor: 'pointer',
  // boxShadow: '0px 2px 6px 1px rgba(0, 0, 0, 0.2)',
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
let isScreensharing = false;
let myUserId = '';
let userIdScreensharing = '';

export function Videocall() {
  const roomId = window.location.pathname.split('/')[1];
  const myPeer = new Peer();
  let muteButtonHovered = false;

  const myVideo = videoWrap('', true, { transform: 'rotateY(180deg)' });

  myPeer.on('open', (id) => {
    myUserId = id;
    socket.emit('join-room', roomId, myUserId);
    myVideo.id = myUserId;
  });

  const view = Div({
    styles: { height: '100%', backgroundColor: '#656565' },
  });
  const el = Div({
    id: 'videos',
    styles: {
      height: 'calc(100% - 68px)',
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
    let localScreenStream: MediaStream | undefined;

    if (!stream) {
      view.append(mediaAccessBlocked());
      return view;
    }

    addVideoStream(myVideo, stream); /* Display our video to ourselves */
    myStream = stream;

    myPeer.on('call', (call) => {
      peers.push({ userId: call });
      call.answer(myStream); /* Stream them our video/audio */

      const video = videoWrap(call.peer);
      // console.log('call metadata', call.metadata);
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

    socket.on('change-layout', (userSharing) => {
      userIdScreensharing = userSharing;
      adjustLayout(userSharing);
    });

    socket.on('user-disconnected', (userId: string) => {
      const userToDisconnect = peers.find(
        (peer) => peer.userId?.peer === userId
      );
      const index = peers.findIndex((peer) => peer === userToDisconnect);
      peers.splice(index, 1);
      userToDisconnect?.userId.close();
      const videoRemoved = byId(userToDisconnect.userId.peer);
      videoRemoved?.remove();
      adjustLayout(userIdScreensharing);
    });

    const buttons = Div({
      styles: {
        width: '100%',
        display: 'flex',
        position: 'fixed',
        bottom: '20px',
        justifyContent: 'center',
      },
    });

    const exitCallButton = Button({
      class: 'action-buttons',
      innerHTML: phoneIcon,
      styles: {
        width: '60px',
        borderRadius: '20px',
        right: '20px',
        fontSize: '20px',
        cursor: 'pointer',
        backgroundColor: '#d73030',
        color: '#fff',
        marginLeft: '12px',
      },
      onClick: () => {
        socket.close();
        myStream.getTracks().forEach((track) => track.stop());
        removeVideocallListeners();
        setURL('/');
      },
    });

    const rotatedIcon = exitCallButton.firstChild as SVGAElement;
    rotatedIcon.style.transform = 'rotate(137deg)';

    const muteTextTooltip = Div({
      innerText: `Mute/Unmute (${isMac ? '⌘' : 'Ctrl'} + d)`,
      styles: {
        background: '#3f4651',
        color: '#fff',
        width: 'max-content',
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        position: 'absolute',
        transform: ' translate(-45%, -60px)',
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
      onClick: onSharecaptureClick,
    });

    function addVideoStream(div: HTMLDivElement, stream: MediaStream) {
      const video = div.firstChild as HTMLVideoElement;
      video.srcObject = stream;
      video.addEventListener('loadedmetadata', () => video.play());
      el.appendChild(div);
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

      const otherUserVideo = videoWrap(userId);

      /* Add their video */
      call.on('stream', (userVideoStream) => {
        addVideoStream(otherUserVideo, userVideoStream);
        adjustLayout(userIdScreensharing);
        replaceStreamForNewUser(userId);
      });

      call.on('close', () => otherUserVideo.remove());
      peers.push({ userId: call });
    }

    function replaceStreamForNewUser(newUser: string) {
      if (userIdScreensharing === myUserId && localScreenStream) {
        const [screenTrack] = localScreenStream.getVideoTracks();
        const newPeer = peers.find((peer) => peer.userId.peer === newUser);
        const { peerConnection } = newPeer.userId;
        if (!peerConnection) return;
        const rtpSender = peerConnection
          .getSenders()
          .find((sender) => sender.track.kind === screenTrack.kind);
        rtpSender.replaceTrack(screenTrack);
      }
    }

    function handleSharescreen(stream: MediaStream) {
      if (isScreensharing) {
        localScreenStream?.getTracks().forEach((track) => track.stop());
      }

      stream.getVideoTracks()[0].onended = () => handleSharescreen(myStream);

      const [screenTrack] = stream.getVideoTracks();
      peers.forEach((peer) => {
        const { peerConnection } = peer.userId;
        if (!peerConnection) return;
        const rtpSender = peerConnection
          .getSenders()
          .find((sender) => sender.track.kind === screenTrack.kind);
        rtpSender.replaceTrack(screenTrack);
        socket.emit('change-layout', isScreensharing ? '' : myUserId);
      });

      const videoDiv = byId(myUserId);
      const myVideo = videoDiv?.firstChild as HTMLVideoElement;
      myVideo.srcObject = stream;
      myVideo.play();
      // adjustLayout(myUserId);

      shareScreenButton.style.border = isScreensharing
        ? 'none'
        : '1px solid #6b3890';
      shareScreenButton.style.backgroundColor = isScreensharing
        ? '#fff'
        : '#6b3890';
      shareScreenButton.style.color = isScreensharing ? '#808080' : '#fff';

      isScreensharing = isScreensharing ? false : true;
      userIdScreensharing = myUserId;
    }

    async function onSharecaptureClick() {
      let stream: MediaStream | undefined;
      if (!isScreensharing) {
        stream = await getLocalScreenStream();
        localScreenStream = stream;
      } else {
        stream = await getLocalUserMedia();
      }
      if (!stream) return;
      handleSharescreen(stream);
    }

    function adjustLayout(userScreensharing?: string) {
      const screencaptureEl =
        userScreensharing && (byId(userScreensharing) as HTMLVideoElement);
      console.log(
        'adjusting layout: ',
        userScreensharing,
        screencaptureEl && !isScreensharing ? 'screenshare' : 'regular'
      );
      screencaptureEl
        ? screenshareLayout(screencaptureEl, view, el)
        : regularLayout(view, el);
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

function muteSelf() {
  const muteButton = byId('mute-btn') as HTMLButtonElement;
  const audioTracks = myStream.getAudioTracks()[0];

  if (audioTracks.enabled) {
    muteButton.innerHTML = microphoneSlashIcon;
    muteButton.style.color = '#ee5447';
    muteButton.style.border = '1px solid #ee5447';
    audioTracks.enabled = false;
  } else {
    muteButton.innerHTML = microphoneIcon;
    muteButton.style.color = '#808080';
    muteButton.style.border = 'none';
    audioTracks.enabled = true;
  }
  isSelfMuted = !isSelfMuted;
}

function videoWrap(
  id: string,
  muted = false,
  customStyle?: Partial<CSSStyleDeclaration>
) {
  const wrapper = Div({
    styles: {
      padding: '4px',
      display: 'flex',
      height: '100%',
      justifyContent: 'center',
    },
  });

  wrapper.id = id;
  const video = Video({ muted, styles: { ...styles, ...customStyle } });
  wrapper.append(video);
  return wrapper;
}

function screenshareLayout(
  screencaptureEl: HTMLVideoElement,
  parent: HTMLDivElement,
  streamsDiv: HTMLDivElement
) {
  screencaptureEl.style.transform = 'rotateY(0deg)';

  const video = screencaptureEl.firstChild as HTMLVideoElement;
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'contain';

  streamsDiv.style.width = '16%';
  streamsDiv.style.flexFlow = 'column no-wrap';
  parent.style.display = 'flex';
  parent.style.flexDirection = 'row';
  parent.style.height = '100%';
  screencaptureEl.style.width = '84%';
  screencaptureEl.style.height = 'calc(100% - 68px)';
  parent.prepend(screencaptureEl);
  updateChildrenMeasurements(streamsDiv, '100%', 'auto', '100%', 'auto'); //if not change width wrapper to auto as well

  if (peers.length >= 2) {
    const me = byId(myUserId) as HTMLDivElement;
    me.style.position = '';
    me.style.margin = '';
    streamsDiv.append(me);
  }
}

function regularLayout(parent: HTMLDivElement, streamsDiv: HTMLDivElement) {
  const me = byId(myUserId) as HTMLDivElement;

  if (peers.length === 0) {
    const myVideo = me.firstChild as HTMLVideoElement;
    streamsDiv.append(me);

    me.style.height = '100%';
    me.style.position = 'inherit';
    me.style.bottom = '0';
    me.style.right = '0';
    me.style.margin = '0';
    myVideo.style.height = '';
    myVideo.style.width = '';
    return;
  }

  if (peers.length === 1) {
    twoPeopleLayout(me, parent, streamsDiv);
    return;
  }

  if (parent.firstChild !== streamsDiv) {
    const prevScreensharingDiv = parent.firstChild as HTMLDivElement;
    prevScreensharingDiv.style.width = '';

    const prevScreen = prevScreensharingDiv.firstChild as HTMLVideoElement;
    prevScreen.style.objectFit = 'cover';
    streamsDiv.append(prevScreensharingDiv);
  }

  streamsDiv.append(me);
  streamsDiv.style.width = '';
  me.style.height = '';
  me.style.position = 'inherit';
  me.style.bottom = '0';
  me.style.right = '0';
  me.style.margin = '0';

  const columns = getColumns(streamsDiv);
  const videoWidth = window.innerWidth / columns;
  const rows = Math.ceil(streamsDiv.children.length / columns);
  const videoHeight = streamsDiv.offsetHeight / rows;
  const widthStr = (videoWidth - 40).toString();
  const heightStr = (videoHeight - 20).toString();
  const wrapperProp = streamsDiv.childElementCount <= 4 ? 'auto' : '100%';

  updateChildrenMeasurements(
    streamsDiv,
    widthStr,
    heightStr,
    wrapperProp,
    wrapperProp
  );
}

function twoPeopleLayout(
  screenCaptureDiv: HTMLDivElement,
  parent: HTMLDivElement,
  streamsDiv: HTMLDivElement
) {
  screenCaptureDiv.style.objectFit = 'cover';
  screenCaptureDiv.style.position = 'fixed';
  screenCaptureDiv.style.width = '';
  screenCaptureDiv.style.bottom = '0';
  screenCaptureDiv.style.right = '0';
  screenCaptureDiv.style.height = '20%';
  screenCaptureDiv.style.margin = '12px';
  const screenCapture = screenCaptureDiv.firstChild as HTMLVideoElement;
  if (screenCapture) {
    screenCapture.style.width = '';
    screenCapture.style.height = '';
  }

  streamsDiv.style.width = '100%';

  parent.style.height = '100%';
  parent.prepend(screenCaptureDiv);

  updateChildrenMeasurements(streamsDiv, '100%', '100%', 'auto', '100%');
}

function updateChildrenMeasurements(
  element: HTMLElement,
  width: string,
  height: string,
  wrapperWidth: string,
  wrapperHeight: string
) {
  Array.from(element.children).forEach((child) => {
    (child as HTMLDivElement).style.height = wrapperHeight;
    (child as HTMLDivElement).style.width = wrapperWidth;
    const videoEl = child.firstChild as HTMLVideoElement;
    videoEl.style.height = height;
    videoEl.style.width = width;
  });
}

function mediaAccessBlocked() {
  const noUserMedia = Div({
    innerText: 'Access to microphone and camera needed.',
  });
  return noUserMedia;
}

function getColumns(element: HTMLDivElement) {
  let col = 0;
  if (element.childElementCount === 1) {
    col = 1;
    // } else if (element.childElementCount === 3 && window.innerWidth > 1200) {
    //   col = 3;
  } else if (element.childElementCount > 1 && element.childElementCount <= 4) {
    col = 2;
  } else if (element.childElementCount > 4 && element.childElementCount <= 9) {
    col = 3;
  } else if (element.childElementCount > 9) {
    col = 4;
  }
  return col;
}

function addVideocallListeners() {
  document.addEventListener('keydown', onMuteKeydownCmd);
  document.addEventListener('keyup', onMuteKeyupCmd);
}

export function removeVideocallListeners() {
  document.removeEventListener('keydown', onMuteKeydownCmd);
  document.removeEventListener('keyup', onMuteKeyupCmd);
}
