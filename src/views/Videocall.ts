import { io } from 'socket.io-client';
import Peer from 'peerjs';
import { Div } from '../../../labs/ui/components/Div';
import { Video } from '../../../labs/ui/components/Video';
import { byId } from '../../../labs/ui/utils/DomUtils';
const socket = io();

const getUserMedia =
  navigator?.mediaDevices?.getUserMedia ||
  (navigator as any).getUserMedia ||
  (navigator as any).webkitGetUserMedia ||
  (navigator as any).mozGetUserMedia;

const videoStyles = {
  height: '100%',
  width: '100%',
  objectFit: 'cover',
  position: 'relative',
  // left: '50%',
  // right: '50%',
};

const peers: any = [];
export function Videocall() {
  const roomId = window.location.pathname.split('/')[1];
  let grid: number = 0;

  const myPeer = new Peer();

  myPeer.on('open', (id) => {
    socket.emit('join-room', roomId, id);
  });

  const el = Div({
    styles: {
      height: '100vh',
      display: 'grid',
      gridGap: '10px',
    },
  });

  const myVideo = Video({
    muted: true,
    styles: videoStyles,
  });

  getUserMedia({
    video: true,
    audio: true,
  }).then((stream) => {
    addVideoStream(myVideo, stream);

    myPeer.on('call', (call) => {
      peers.push({ userId: call });
      call.answer(stream);
      const video = Video({
        styles: videoStyles,
      });
      call.on('stream', (userVideoStream) => {
        el.style.gridTemplateColumns = `repeat(${calcGrid() + 1}, 1fr)`;
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('user-connected', (userId) => {
      // console.log('user id', userId);
      connectToNewUser(userId, stream);
      el.style.gridTemplateColumns = `repeat(${calcGrid() + 1}, 1fr)`;
      // console.log('connecting to new user', grid, peers);
    });
    const grid = calcGrid() + 1;
    const remainingVideos = (peers.length + 1) % grid;
    console.log('remaining videos', peers.length + 1, grid, remainingVideos);
    if (remainingVideos) {
      // console.log('the new video', video);
      // video.style.left = '50%';
      // video.style.right = '50%';
    }
  });

  socket.on('user-disconnected', (userId) => {
    const userToDisconnect = peers.find((peer) => peer.userId.peer === userId);
    userToDisconnect?.userId.close();
  });

  function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      video.play();
    });
    el.append(video);
  }

  function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream); // call and send our video stream
    const otherUserVideo = Video({
      styles: videoStyles,
    });
    call.on('stream', (userVideoStream) => {
      addVideoStream(otherUserVideo, userVideoStream);
    });
    call.on('close', () => {
      otherUserVideo.remove();
    });
    peers.push({ userId: call });
  }

  function calcGrid() {
    if (peers.length === 1) {
      grid = 1;
    } else if (peers.length > 1 && peers.length <= 4) {
      grid = 2;
      // } else if (peers.length > 4 && peers.length <= 9) {
      //   grid = 3;
    } else if (peers.length > 9) {
      grid = 4;
    }
    // console.log('then grid will be', grid);
    return grid;
  }
  return el;
}
