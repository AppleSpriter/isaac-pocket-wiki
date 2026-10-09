import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';

// Other apps (e.g. 押注自己) open an entry with parameters { item: 'C12' }; the page reads it from AppStorage.
export const OPEN_ITEM_KEY: string = 'isaac.openItem';
const ITEM_KEY: RegExp = /^[A-Za-z]{1,3}[0-9]{1,4}$/;

function takeItem(want: Want): void {
  const value: Object | undefined = want.parameters === undefined ? undefined : want.parameters['item'];
  if (typeof value === 'string' && ITEM_KEY.test(value)) {
    // A timestamp lets the same item be requested twice in a row and still trigger the page.
    AppStorage.setOrCreate<string>(OPEN_ITEM_KEY, value + '|' + Date.now().toString());
  }
}

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    takeItem(want);
  }

  onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    takeItem(want);
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    try {
      const mainWindow = windowStage.getMainWindowSync();
      mainWindow.setWindowSystemBarProperties({
        statusBarColor: '#251e20',
        statusBarContentColor: '#efe5d0',
        navigationBarColor: '#211b1e',
        navigationBarContentColor: '#efe5d0'
      }).catch((error: Error) => console.error(`Could not style system bars: ${error.message}`));
      windowStage.loadContent('pages/Index');
    } catch (error) {
      console.error(`Could not show the offline wiki: ${error}`);
    }
  }
}
