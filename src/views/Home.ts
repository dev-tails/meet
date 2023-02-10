import { Button, Div, Input } from '../ui/components/';
import { setURL } from '../utils/HistoryUtils';
import { copyIcon } from '../utils/FontAwesomeIcons';
import { setStyle } from '../utils/DomUtils';

const buttonLinks = {
  padding: '8px 12px',
  background: 'none',
  cursor: 'pointer',
  border: '1px solid #3760bb',
  borderRadius: '4px',
  color: '#3760bb',
  fontSize: '14px',
  fontFamily: 'Raleway, sans-serif',
  boxShadow: '0px 2px 6px 1px rgba(0, 0, 0, 0.1)',
};

export function Home() {
  const randomId = new Date().getTime();
  const url = `${window.location}${randomId}`;

  const el = Div({ styles: { display: 'contents' } });

  const blob = Div({
    styles: {
      background: '#5b67da',
      width: '100%',
      height: '20%',
      borderRadius: '0 0 100% 100%',
    },
  });
  el.append(blob);

  const container = Div({
    styles: {
      margin: '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
  });

  const title = Div({
    innerHTML: 'You make the <b>plans</b>, we <b>bridge</b> the gap.',
    styles: { marginBottom: '8px', fontSize: '28px', fontWeight: '100' },
  });
  container.append(title);

  const descriptionText = Div({
    innerHTML: 'Video conferencing made easy and free, no more time limits.',
    styles: { marginBottom: '48px' },
  });
  container.append(descriptionText);

  const inputContainer = Div({ styles: { width: '100%', maxWidth: '500px' } });
  const text = Div({
    innerHTML:
      'Use this unique id or type something fun to use as your url path:',
    styles: { marginBottom: '8px' },
  });
  inputContainer.append(text);

  const input = Input({
    styles: {
      width: '100%',
      height: '40px',
      padding: '8px',
      fontSize: '14px',
      borderRadius: '4px',
      border: '1px solid #959595',
      background: 'none',
      color: '#333',
      outline: 'none',
      boxShadow: '0px 2px 6px 1px rgba(0, 0, 0, 0.1)',
    },
    placeholder: url,
  });
  inputContainer.append(input);
  container.append(inputContainer);

  const links = Div({ styles: { marginTop: '28px' } });

  const startMeeting = Button({
    innerHTML: 'Start meeting',
    styles: {
      ...buttonLinks,
      marginRight: '20px',
      backgroundColor: '#3760bb',
      color: '#fff',
    },
    onClick: () => {
      setURL(
        input.value ? `${window.location}${input.value}` : input.placeholder
      );
    },
    onMouseEnter: () => setStyle(startMeeting, { opacity: '.9' }),
    onMouseLeave: () => setStyle(startMeeting, { opacity: '1' }),
  });

  const copied = Div({
    innerHTML: 'Copied link to clipboard.',
    styles: {
      position: 'absolute',
      top: '-80px',
      right: '-260px',
      border: '1px solid #636363',
      backgroundColor: '#636363',
      color: '#fff',
      padding: '8px',
      borderRadius: '4px',
      width: '200px',
      opacity: '1',
      transition: 'all .25s linear',
    },
  });
  const copyLink = Button({
    innerHTML: `Copy for later ${copyIcon}`,
    onClick: () => {
      input.select();
      input.setSelectionRange(0, 99999);

      navigator.clipboard.writeText(`${window.location}${input.value}`);
      copied.style.opacity = '1';
      copyLink.append(copied);
      setTimeout(() => {
        copied.style.opacity = '0';
      }, 1500);
    },
    onMouseEnter: () => setStyle(copyLink, { color: '#7d9ad9' }),
    onMouseLeave: () => setStyle(copyLink, { color: '#3760bb' }),
    styles: { ...buttonLinks, position: 'relative' },
  });

  links.append(startMeeting);
  links.append(copyLink);

  container.append(links);
  el.append(container);

  return el;
}
