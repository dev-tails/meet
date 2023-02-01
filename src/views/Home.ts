import { Button, Div, Input } from '../ui/components/';
import { setURL } from '../utils/HistoryUtils';
import { copyIcon } from '../utils/FontAwesomeIcons';

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
  const el = Div({ styles: { margin: '40px' } });

  const container = Div();
  const text = Div({
    innerText: 'New meeting',
    styles: { marginBottom: '20px', fontSize: '16px' },
  });

  container.append(text);
  const input = Input({
    styles: {
      width: '500px',
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
  });

  const links = Div({ styles: { marginTop: '20px' } });
  let randomId = new Date().getTime();

  const startMeeting = Button({
    innerHTML: 'Start meeting now',
    styles: {
      ...buttonLinks,
      marginRight: '20px',
      backgroundColor: '#3760bb',
      color: '#fff',
    },
    onClick: () => {
      setURL(input.value);
    },
  });

  const copied = Div({
    innerText: 'Copied link to clipboard.',
    styles: {
      position: 'fixed',
      top: '24px',
      left: '50%',
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

      navigator.clipboard.writeText(input.value);
      copied.style.opacity = '1';
      copyLink.append(copied);
      setTimeout(() => {
        copied.style.opacity = '0';
      }, 1000);
    },
    styles: buttonLinks,
  });

  links.append(startMeeting);
  links.append(copyLink);

  const getIdBtn = Button({
    innerHTML: 'Create',
    onClick: () => {
      container.append(input);
      input.value = `${window.location}${randomId}`;
      container.append(links);
      getIdBtn.remove();
    },
    styles: { ...buttonLinks, backgroundColor: '#3760bb', color: '#fff' },
  });

  container.append(getIdBtn);
  el.append(container);

  return el;
}
