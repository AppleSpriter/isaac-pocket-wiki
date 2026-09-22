package wiki.isaac.pocket;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

/** A small offline container. No JavaScript bridge, network permission or remote code. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/index.html";
    private WebView webView;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(37,30,32));
        getWindow().setNavigationBarColor(Color.rgb(33,27,30));
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(37,30,32));
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(safe.left,safe.top,safe.right,safe.bottom);
            } else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(37,30,32));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost()) || path == null || !path.startsWith("/assets/") || path.contains("..")) return denied();
                String asset = path.substring(8);
                String mime = asset.endsWith(".html") ? "text/html" : asset.endsWith(".css") ? "text/css" : asset.endsWith(".js") ? "application/javascript" : asset.endsWith(".json") ? "application/json" : asset.endsWith(".gif") ? "image/gif" : asset.endsWith(".png") ? "image/png" : "application/octet-stream";
                try { return new WebResourceResponse(mime,"UTF-8",200,"OK",Collections.singletonMap("Cache-Control","no-cache"),getAssets().open(asset)); }
                catch(IOException e) { return denied(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())) return false;
                if (request.isForMainFrame() && "https".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
                    catch(ActivityNotFoundException e) { Toast.makeText(MainActivity.this,"没有可用的浏览器",Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
        });
        root.addView(webView,new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        root.requestApplyInsets();
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) webView.loadUrl(START);
    }

    private WebResourceResponse denied() {
        return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
    }

    @Override public void onBackPressed() {
        webView.evaluateJavascript("Boolean(window.handleAndroidBack && window.handleAndroidBack())", result -> {
            if (!"true".equals(result)) finish();
        });
    }
    @Override protected void onSaveInstanceState(Bundle outState) { super.onSaveInstanceState(outState); webView.saveState(outState); }
    @Override protected void onPause() { super.onPause(); webView.onPause(); }
    @Override protected void onResume() { super.onResume(); if(webView!=null)webView.onResume(); }
    @Override protected void onDestroy() { if(webView!=null)webView.destroy(); super.onDestroy(); }
}
