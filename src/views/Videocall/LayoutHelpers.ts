import { MediaConnection } from 'peerjs';
import { Div, Video } from '../../ui/components';
import { byId, setStyle } from '../../utils/DomUtils';

const videoStyles = {
  objectFit: 'contain',
  borderRadius: '4px',
};

export function videoWrap(
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
  const video = Video({ muted, styles: { ...videoStyles, ...customStyle } });
  wrapper.append(video);
  return wrapper;
}

export function screenshareLayout(
  myUserId: string,
  main: HTMLDivElement,
  parent: HTMLDivElement,
  streamsDiv: HTMLDivElement,
  peers: { userId: MediaConnection }[]
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
    twoPeopleLayout(myUserId, secondary, parent, streamsDiv);
  }
}

export function regularLayout(
  myUserId: string,
  parent: HTMLDivElement,
  streamsDiv: HTMLDivElement,
  peers: { userId: MediaConnection }[]
) {
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
    twoPeopleLayout(myUserId, me, parent, streamsDiv);
    return;
  }

  if (parent.firstChild !== streamsDiv) {
    const prevScreensharingDiv = parent.firstChild as HTMLDivElement;
    setStyle(prevScreensharingDiv, { width: '' });

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
  const rows = Math.ceil(streamsDiv.children.length / columns);
  const videoHeight = streamsDiv.offsetHeight / rows;
  const heightStr = `${(videoHeight - 20).toString()}px`;

  updateChildrenMeasurements(streamsDiv, 'auto', heightStr, 'auto', 'auto');
}

export function twoPeopleLayout(
  myUserId: string,
  secondary: HTMLDivElement,
  parent: HTMLDivElement,
  videosDiv: HTMLDivElement
) {
  setStyle(secondary, {
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

export function updateChildrenMeasurements(
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
    setStyle(videoEl, { width, height });
  });
}

export function getColumns(element: HTMLDivElement) {
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
