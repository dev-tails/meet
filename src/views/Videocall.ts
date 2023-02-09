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
  objectFit: 'cover',
  borderRadius: '4px',
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
      gap: '12px',
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
      /* When we receive their stream */
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
        userIdScreensharing = call.metadata;
        adjustLayout(userIdScreensharing);
      });
    });

    socket.on('user-connected', (userId) => {
      console.log(
        'someone joined and this is screen sharing:',
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
      styles: { ...buttonStyles, marginLeft: '24px' },
      onClick: muteSelf,
      onMouseEnter: () => {
        muteButtonHovered = true;
        setStyle(muteTextTooltip, { opacity: '1' });
        muteButton.append(muteTextTooltip);
      },
      onMouseLeave: () => {
        muteButtonHovered = false;
        !muteButtonHovered &&
          setTimeout(() => setStyle(muteTextTooltip, { opacity: '0' }), 200);
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
      video.addEventListener('loadedmetadata', () => {
        video.play();
        console.log('playing', div, div.id, video.played);
      });
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

    async function replaceStreamForNewUser(newUser: string) {
      if (userIdScreensharing === myUserId) {
        console.log('i am the one screen sharing');
        if (!localScreenStream) {
          localScreenStream = (await getLocalScreenStream()) as MediaStream;
          console.log('local ', localScreenStream);
        }
        const [screenTrack] = localScreenStream.getVideoTracks();
        const newPeer = peers.find((peer) => peer.userId.peer === newUser);
        const { peerConnection } = newPeer.userId;
        if (!peerConnection) return;
        const rtpSender = peerConnection
          .getSenders()
          .find((sender) => sender.track.kind === screenTrack.kind);
        console.log('rtp sender', rtpSender);
        console.log('st', screenTrack);
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
      setStyle(myVideo, {
        transform: `rotateY(${isScreensharing ? '180' : '0'}deg)`,
      });

      setStyle(shareScreenButton, {
        border: isScreensharing ? 'none' : '1px solid #6b3890',
        backgroundColor: isScreensharing ? '#fff' : '#6b3890',
        color: isScreensharing ? '#808080' : '#fff',
      });

      isScreensharing = isScreensharing ? false : true;
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
      console.log('user screensharer in adjust:', userIdScreensharing);
      const userScreensharingExists =
        view.firstElementChild?.id === userIdScreensharing ||
        Array.from(el.children).find((elem) => elem.id === userIdScreensharing);
      if (!userScreensharingExists) {
        userIdScreensharing = '';
        regularLayout(view, el);
        return;
      }

      const myUserIsScreensharing = userScreensharing === userIdScreensharing;
      const screencaptureEl =
        userScreensharing && (byId(userScreensharing) as HTMLDivElement);

      screencaptureEl && !myUserIsScreensharing
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
    const stream = await getUserMedia({ video: true, audio: true });
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
    setStyle(muteButton, { color: '#ee5447', border: '1px solid #ee5447' });
    audioTracks.enabled = false;
  } else {
    muteButton.innerHTML = microphoneIcon;
    setStyle(muteButton, { color: '#808080', border: 'none' });
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
  main: HTMLDivElement,
  parent: HTMLDivElement,
  streamsDiv: HTMLDivElement
) {
  setStyle(main, { transform: 'rotateY(0deg)' });

  const video = main.firstChild as HTMLVideoElement;
  setStyle(video, { width: '100%', height: '100%', objectFit: 'contain' });

  const secondary = byId(myUserId) as HTMLDivElement;

  if (peers.length >= 2) {
    setStyle(streamsDiv, { width: '16%', flexFlow: 'column no-wrap' });
    setStyle(parent, { display: 'flex', flexDirection: 'row', height: '100%' });
    setStyle(main, { width: '84%', height: 'calc(100% - 68px)' });
    parent.prepend(main);
    updateChildrenMeasurements(streamsDiv, '100%', 'auto', '100%', 'auto'); //if not change width wrapper to auto as well

    setStyle(secondary, { position: '', margin: '' });
    streamsDiv.append(secondary);
  } else {
    twoPeopleLayout(secondary, parent, streamsDiv);
  }
}

function regularLayout(parent: HTMLDivElement, streamsDiv: HTMLDivElement) {
  const me = byId(myUserId) as HTMLDivElement;

  if (peers.length === 0) {
    const myVideo = me.firstChild as HTMLVideoElement;
    streamsDiv.append(me);
    setStyle(me, {
      height: '100%',
      position: '',
      bottom: '',
      right: '',
      margin: '',
    });

    setStyle(myVideo, { height: '', width: '' });
    return;
  }

  if (peers.length === 1) {
    twoPeopleLayout(me, parent, streamsDiv);
    return;
  }

  if (parent.firstChild !== streamsDiv) {
    const prevScreensharingDiv = parent.firstChild as HTMLDivElement;
    setStyle(prevScreensharingDiv, { width: '' });

    const prevScreen = prevScreensharingDiv.firstChild as HTMLVideoElement;
    setStyle(prevScreen, { objectFit: 'cover' });
    streamsDiv.append(prevScreensharingDiv);
  }

  streamsDiv.append(me);
  setStyle(streamsDiv, { width: '' });
  setStyle(me, {
    height: '',
    position: 'inherit',
    bottom: '0',
    right: '0',
    margin: '0',
  });

  const columns = getColumns(streamsDiv);
  const videoWidth = window.innerWidth / columns;
  const rows = Math.ceil(streamsDiv.children.length / columns);
  const videoHeight = streamsDiv.offsetHeight / rows;
  const widthStr = (videoWidth - 40).toString();
  const heightStr = (videoHeight - 20).toString();

  updateChildrenMeasurements(streamsDiv, widthStr, heightStr, 'auto', 'auto');
}

function twoPeopleLayout(
  secondary: HTMLDivElement,
  parent: HTMLDivElement,
  videosDiv: HTMLDivElement
) {
  setStyle(secondary, {
    objectFit: 'cover',
    position: 'fixed',
    zIndex: '1',
    width: '',
    bottom: '0',
    right: '0',
    height: '20%',
    margin: '12px',
  });

  const video = secondary.firstChild as HTMLVideoElement;
  if (video) {
    setStyle(video, { width: '', height: '' });
  }

  const otherUser = Array.from(videosDiv.children).find(
    (el) => el.id !== myUserId
  ) as HTMLDivElement;
  if (otherUser) {
    const otherUserVideo = otherUser?.lastChild as HTMLVideoElement;
    setStyle(otherUser, { width: '100%', height: '100%' });
    setStyle(otherUserVideo, { width: '', height: '' });
    setStyle(videosDiv, { width: '100%' });
  } else {
    const mainVideo = parent.firstChild as HTMLDivElement;
    setStyle(mainVideo, { width: '100%' });
    setStyle(videosDiv, { width: '' });
  }
}

function updateChildrenMeasurements(
  element: HTMLElement,
  width: string,
  height: string,
  wrapperWidth: string,
  wrapperHeight: string
) {
  Array.from(element.children).forEach((child) => {
    setStyle(child as HTMLDivElement, {
      height: wrapperHeight,
      width: wrapperWidth,
    });
    const videoEl = child.firstChild as HTMLVideoElement;
    setStyle(videoEl, { height, width });
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
