import { common } from '@kit.AbilityKit';
import { webview } from '@kit.ArkWeb';

// The reserved .invalid domain is never contacted: every bundled file is
// served from rawfile by onInterceptRequest under one secure Web origin.
const OFFLINE_ROOT: string = 'https://isaac-pocket.invalid/';
const LOCAL_FILE: RegExp = /^(index\.html|style\.css|app\.js|search\.js|data\.js|data\.json|platform\.js|assets\/[a-zA-Z0-9-]+\.(png|gif))$/;

@Entry
@Component
struct Index {
  private controller: webview.WebviewController = new webview.WebviewController();

  private mimeType(path: string): string {
    if (path.endsWith('.html')) return 'text/html';
    if (path.endsWith('.css')) return 'text/css';
    if (path.endsWith('.js')) return 'application/javascript';
    if (path.endsWith('.json')) return 'application/json';
    if (path.endsWith('.gif')) return 'image/gif';
    return 'image/png';
  }

  private openSource(url: string): void {
    if (!url.startsWith('https://isaac.huijiwiki.com/') &&
        !url.startsWith('https://creativecommons.org/')) return;
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    context.startAbility({
      action: 'ohos.want.action.viewData',
      entities: ['entity.system.browsable'],
      uri: url
    }).catch((error: Error) => console.error(`Could not open source: ${error.message}`));
  }

  onBackPress(): boolean {
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    this.controller.runJavaScript('Boolean(window.handleAppBack && window.handleAppBack())')
      .then((handled: string) => {
        if (handled !== 'true') context.terminateSelf();
      })
      .catch(() => context.terminateSelf());
    return true;
  }

  build() {
    Column() {
      Web({ src: OFFLINE_ROOT + 'index.html', controller: this.controller })
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(false)
        .imageAccess(true)
        .onLoadIntercept((event) => {
          if (!event) return true;
          const url: string = event.data.getRequestUrl();
          if (url.startsWith(OFFLINE_ROOT)) return false;
          this.openSource(url);
          return true;
        })
        .onInterceptRequest((event) => {
          if (!event) return null;
          const url: string = event.request.getRequestUrl();
          if (!url.startsWith(OFFLINE_ROOT)) return null;
          const path: string = url.substring(OFFLINE_ROOT.length);
          if (!LOCAL_FILE.test(path)) return null;
          const response = new WebResourceResponse();
          response.setResponseData($rawfile(path));
          response.setResponseEncoding('utf-8');
          response.setResponseMimeType(this.mimeType(path));
          response.setResponseCode(200);
          response.setReasonMessage('OK');
          response.setResponseIsReady(true);
          return response;
        })
        .width('100%')
        .height('100%');
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#251e20')
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM]);
  }
}
