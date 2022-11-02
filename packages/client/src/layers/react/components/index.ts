import {registerComponentBrowser} from './ComponentBrowser';
import {registerActionQueue} from './ActionQueue';
import {registerLoadingState} from './LoadingState';
import {registerControlPanel} from './ControlPanel';

export function registerUIComponents() {
  registerLoadingState();
  registerComponentBrowser();
  registerActionQueue();
  registerControlPanel();
}
