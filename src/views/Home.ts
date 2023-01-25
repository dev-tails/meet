import { Button } from '../../../labs/ui/components/Button';
import { Div } from '../../../labs/ui/components/Div';
import { Input } from '../../../labs/ui/components/Input';
import { setURL } from '../../../labs/chat/fe/src/utils/HistoryUtils';
import { v4 as uuidV4 } from 'uuid';

const buttonLinks = {
  padding: '8px',
  background: 'none',
  cursor: 'pointer',
  border: '1px solid #438796',
  borderRadius: '4px',
  color: '#438796',
  fontSize: '14px',
};

export function Home() {
  const el = Div({ styles: { margin: '40px' } });

  const container = Div();
  const text = Div({
    innerText: 'New meeting',
    styles: { marginBottom: '12px', fontSize: '18px' },
  });

  container.append(text);
  const input = Input({
    styles: {
      width: '480px',
      height: '40px',
      padding: '8px',
      fontSize: '14px',
      borderRadius: '4px',
      border: '1px solid #f1f2f3',
      backgroundColor: '#f1f2f3',
      color: '#333',
      outline: 'none',
    },
  });
  input.disabled = true;

  const links = Div({ styles: { marginTop: '12px' } });
  let randomId = uuidV4();

  const startMeeting = Button({
    innerHTML: 'Start meeting now',
    styles: {
      ...buttonLinks,
      marginRight: '20px',
      backgroundColor: '#438796',
      color: '#fff',
    },
    onClick: () => {
      setURL(`${window.location}${randomId}`);
    },
  });

  const copied = Div({
    innerText: 'Copied link to clipboard.',
    styles: {
      position: 'fixed',
      top: '24px',
      left: '50%',
      border: '1px solid #494f71',
      backgroundColor: '#494f71',
      color: '#fff',
      padding: '8px',
      borderRadius: '4px',
      width: '200px',
      opacity: '1',
      transition: 'all .25s linear',
    },
  });
  const copyLink = Button({
    innerHTML: 'Copy for later &nbsp&#x1F5CE',
    onClick: () => {
      input.select();
      input.setSelectionRange(0, 99999);

      navigator.clipboard.writeText(`${window.location}${randomId}`);
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
    styles: { ...buttonLinks, backgroundColor: '#438796', color: '#fff' },
  });

  container.append(getIdBtn);
  el.append(container);

  return el;
}
