import { io } from 'socket.io-client';
import Peer from 'peerjs';
import { Div } from '../../../labs/ui/components/Div';
import { Video } from '../../../labs/ui/components/Video';
import { byId } from '../../../labs/ui/utils/DomUtils';
import { Button } from '../../../labs/ui/components/Button';
const socket = io();

function setURL(url: string) {
  history.pushState({}, '', url);
  window.dispatchEvent(new Event('popstate'));
}

const getUserMedia =
  navigator?.mediaDevices?.getUserMedia ||
  (navigator as any).getUserMedia ||
  (navigator as any).webkitGetUserMedia ||
  (navigator as any).mozGetUserMedia;

const styles = {
  height: '100%',
  width: '100%',
  objectFit: 'cover',
  borderRadius: '8px',
  padding: '4px',
};

const peers: any = [];

export function Videocall() {
  const roomId = window.location.pathname.split('/')[1];
  const myPeer = new Peer();

  myPeer.on('open', (id) => {
    socket.emit('join-room', roomId, id);
  });

  const container = Div();
  const el = Div({
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
    addVideoStream(myVideo, stream);

    myPeer.on('call', (call) => {
      peers.push({ userId: call });
      call.answer(stream);
      const video = Video({ styles });
      video.id = call.peer;
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('user-connected', (userId) => {
      setTimeout(connectToNewUser, 1000, userId, stream);
    });
  });

  socket.on('user-disconnected', (userId) => {
    const userToDisconnect = peers.find((peer) => peer.userId?.peer === userId);
    userToDisconnect?.userId.close();
    const videoRemoved = byId(userToDisconnect.userId.peer);
    videoRemoved?.remove();
  });

  function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      video.play();
    });

    if (el.children.length) {
      adjustVideoElements();
    }

    el.append(video);
  }

  function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream); // call and send our video stream
    const otherUserVideo = Video({ styles });
    otherUserVideo.id = userId;

    call.on('stream', (userVideoStream) => {
      addVideoStream(otherUserVideo, userVideoStream);
    });
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

  function adjustVideoElements() {
    const columns = getColumns();
    const videoWidth = window.innerWidth / columns;
    const rows = Math.ceil(el.children.length / columns);
    const videoHeight = window.innerHeight / rows;

    Array.from(el.children).forEach((child) => {
      (child as HTMLElement).style.height = (videoHeight - 20).toString();
      (child as HTMLElement).style.width = (videoWidth - 20).toString();
    });
  }
  const exitCallButton = Button({
    innerHTML: '&#128379',
    styles: {
      position: 'absolute',
      right: '20px',
      bottom: '20px',
      height: '52px',
      width: '52px',
      backgroundColor: '#e62626',
      border: '1px solid red',
      borderRadius: '50%',
      fontSize: '20px',
      color: '#fff',
      cursor: 'pointer',
    },
    onClick: () => {
      socket.close();
      setURL('/');
    },
  });

  container.appendChild(el);
  container.appendChild(exitCallButton);
  return container;
}
