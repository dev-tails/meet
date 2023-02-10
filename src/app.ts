import { byId } from './utils/DomUtils';
import { Router } from './views/Router';

function run() {
  const root = byId('root');

  if (root) {
    const router = Router();
    root.append(router);
  }
}

run();
