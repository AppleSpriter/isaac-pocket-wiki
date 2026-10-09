import { UIAbility } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';

export default class EntryAbility extends UIAbility {
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
