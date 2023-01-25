import { Button } from '../../../labs/ui/components/Button';
import { Div } from '../../../labs/ui/components/Div';
import { Input } from '../../../labs/ui/components/Input';
import { byId } from '../../../labs/ui/utils/DomUtils';
import { v4 as uuidV4 } from 'uuid';

export function Home() {
  const el = Div();

  const container = Div();
  const text = Div({ innerText: 'Get random id' });

  container.append(text);
  const myId = Input({ styles: { width: '300px' } });
  myId.id = 'input-id';
  container.append(myId);

  let randomId = uuidV4();
  const link = document.createElement('a');
  link.innerText = 'Go to link';
  link.href = `${window.location}${randomId}`;

  const getIdBtn = Button({
    innerHTML: 'Get',
    onClick: () => {
      const input = byId('input-id');
      if (input) {
        (input as HTMLInputElement).value = randomId;
        container.append(link);
      }
    },
  });

  container.append(getIdBtn);
  el.append(container);

  return el;
}
