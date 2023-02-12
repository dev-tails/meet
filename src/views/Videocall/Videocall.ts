import { io } from 'socket.io-client';
import Peer, { MediaConnection } from 'peerjs';
import { Div } from '../../ui/components';
import { byId, setStyle } from '../../utils/DomUtils';
import { setURL } from '../../utils/HistoryUtils';
import { regularLayout, screenshareLayout, videoWrap } from './LayoutHelpers';
import {
  getLocalScreenStream,
  getLocalUserMedia,
  mediaAccessBlocked,
} from './StreamHelpers';
import {
  addVideocallListeners,
  removeVideocallListeners,
  selfMuted,
} from './MuteShortcuts';
import { ActionButtons } from './ActionButtons';

const socket = io({
  autoConnect: true,
});

export function Videocall() {
  const roomId = window.location.pathname.split('/')[1];
  const myPeer = new Peer();
  const peers: { userId: MediaConnection }[] = [];

  let isScreensharing = false;
  let userIdScreensharing = '';
  let myUserId = '';

  const view = Div({
    styles: {
      position: 'relative',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#3c3e53',
    },
  });

  async function init() {
    const myVideo = videoWrap('', true, { transform: 'rotateY(180deg)' });

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

    myPeer.on('open', (id) => {
      myUserId = id;
      if (socket.disconnected) {
        socket.connect();
      }
      socket.emit('join-room', roomId, myUserId);
      myVideo.id = myUserId;
    });

    const myStream = await getLocalUserMedia();
    let localScreenStream: MediaStream | undefined;

    if (!myStream) {
      view.append(mediaAccessBlocked());
      return view;
    }

    addVideoStream(myVideo, myStream); /* Display our video to ourselves */
    // myStream = stream;

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

    myPeer.on('error', (err) => {
      console.error('Error:', err);
    });

    socket.on('user-connected', (userId) => {
      console.log(
        'someone joined and this is screen sharing:',
        userIdScreensharing
      );
      connectToNewUser(userId, myStream);
    });

    myPeer.on('disconnected', () => {
      myPeer.destroy();
      socket.close();
      myStream.getTracks().forEach((track) => track.stop());
      removeVideocallListeners();
    });

    socket.on('change-layout', (userSharing) => {
      userIdScreensharing = userSharing;
      adjustLayout(userSharing);
    });

    socket.on('user-disconnected', (userId: string) => {
      const userToDisconnect = peers.find(
        (peer) => peer.userId?.peer === userId
      );
      if (!userToDisconnect) return;
      const index = peers.findIndex((peer) => peer === userToDisconnect);
      peers.splice(index, 1);
      userToDisconnect?.userId.close();
      const videoRemoved = byId(userToDisconnect.userId.peer);
      videoRemoved?.remove();
      adjustLayout(userIdScreensharing);
    });

    function addVideoStream(div: HTMLDivElement, stream: MediaStream) {
      const video = div.firstChild as HTMLVideoElement;
      video.srcObject = stream;
      video.addEventListener('loadedmetadata', () => video.play());
      el.appendChild(div);
    }

    /* When someone joins our room */
    function connectToNewUser(newUserId: string, stream: MediaStream) {
      if (myPeer.disconnected && myPeer.id !== myUserId) {
        return;
      }

      if (stream.getAudioTracks().length) {
        stream.getAudioTracks()[0].enabled = !selfMuted();
      }
      /* Call and send our video stream to the user who just joined */
      const call = myPeer.call(newUserId, stream, {
        metadata: userIdScreensharing,
      });

      const otherUserVideo = videoWrap(newUserId);

      /* Add their video */
      call.on('stream', (userVideoStream) => {
        addVideoStream(otherUserVideo, userVideoStream);
        adjustLayout(userIdScreensharing);
        replaceStreamForNewUser(newUserId);
      });

      call.on('close', () => otherUserVideo.remove());
      peers.push({ userId: call });
    }

    async function replaceStreamForNewUser(newUser: string) {
      if (userIdScreensharing === myUserId) {
        console.log('i am the one screen sharing');
        if (!localScreenStream) {
          localScreenStream = (await getLocalScreenStream()) as MediaStream;
        }
        const [screenTrack] = localScreenStream.getVideoTracks();
        const newPeer = peers.find((peer) => peer.userId.peer === newUser);
        if (!newPeer) return;

        const { peerConnection } = newPeer.userId;
        if (!peerConnection) return;

        const rtpSender = peerConnection
          .getSenders()
          .find((sender) => sender.track?.kind === screenTrack.kind);
        rtpSender?.replaceTrack(screenTrack);
      }
    }

    function handleSharescreen(stream: MediaStream) {
      if (isScreensharing) {
        localScreenStream?.getTracks().forEach((track) => track.stop());
      }

      stream.getVideoTracks()[0].onended = () => handleSharescreen(myStream!);

      const [screenTrack] = stream.getVideoTracks();
      peers.forEach((peer) => {
        const { peerConnection } = peer.userId;
        if (!peerConnection) return;
        const rtpSender = peerConnection
          .getSenders()
          .find((sender) => sender.track?.kind === screenTrack.kind);
        rtpSender?.replaceTrack(screenTrack);
        socket.emit('change-layout', isScreensharing ? '' : myUserId);
      });

      const videoDiv = byId(myUserId);
      const myVideo = videoDiv?.firstChild as HTMLVideoElement;
      myVideo.srcObject = stream;
      myVideo.play();
      setStyle(myVideo, {
        transform: `rotateY(${isScreensharing ? '180' : '0'}deg)`,
      });

      const shareScreenButton = byId('share-button') as HTMLButtonElement;
      shareScreenButton &&
        setStyle(shareScreenButton, {
          border: isScreensharing ? 'none' : '1px solid #5b67da',
          backgroundColor: isScreensharing ? '#fff' : '#5b67da',
          color: isScreensharing ? '#808080' : '#fff',
        });

      isScreensharing = isScreensharing ? false : true;
      const shareScreenTooltip = byId('share-tooltip') as HTMLDivElement;
      shareScreenTooltip &&
        (shareScreenTooltip.innerHTML = `${
          isScreensharing ? 'Stop' : 'Start'
        } screensharing`);
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

    function onExitCallClick() {
      myPeer.disconnect();
      setURL('/');
    }

    function adjustLayout(userScreensharing?: string) {
      console.log('user screensharer in adjust:', userIdScreensharing);
      const userScreensharingExists =
        view.firstElementChild?.id === userIdScreensharing ||
        Array.from(el.children).find((elem) => elem.id === userIdScreensharing);
      if (!userScreensharingExists) {
        userIdScreensharing = '';
        regularLayout(myUserId, view, el, peers);
        return;
      }

      const myUserIsScreensharing = userScreensharing === userIdScreensharing;
      const screencaptureEl =
        userScreensharing && (byId(userScreensharing) as HTMLDivElement);

      screencaptureEl && !myUserIsScreensharing
        ? screenshareLayout(myUserId, screencaptureEl, view, el, peers)
        : regularLayout(myUserId, view, el, peers);
    }

    addVideocallListeners();
    window.addEventListener('popstate', () => myPeer.disconnect(), {
      once: true,
    });

    view.append(el);
    view.append(ActionButtons(onSharecaptureClick, onExitCallClick));
  }

  init();
  return view;
}
