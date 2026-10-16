#!/usr/bin/env python3
"""Makes the Capacitor Android project feel like a game rather than a web page.
Run from the build folder after `npx cap init` (before `npx cap add android`) with `config`,
then after `npx cap add android` with `native`, and once with `splash` to draw the splash images.

  config  capacitor.config.json: dark background (no white flash on launch), App plugin.
  native  MainActivity: full screen (status and navigation bars hidden, swipe to peek),
          screen stays on, text ignores the phone's font-size setting; VIBRATE permission.
  splash  assets/splash*.png for capacitor-assets: the logo on the game's dark background.
"""
import json, os, re, sys

BG = '#0c0806'
PKG = 'com.kitobrito.shatteredrealms'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def config():
    cfg = json.load(open('capacitor.config.json'))
    cfg['backgroundColor'] = BG
    cfg.setdefault('android', {}).update({'backgroundColor': BG, 'allowMixedContent': False, 'captureInput': True})
    json.dump(cfg, open('capacitor.config.json', 'w'), indent=2)


MAIN = """package %(pkg)s;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

// Shattered Realms runs full screen like a game: no status or navigation bar (swipe from an
// edge to peek at them), the screen stays on while it is open, and card text keeps its size
// whatever the phone's font-size setting.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setTextZoom(100);
            getBridge().getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        }
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.hide(WindowInsetsCompat.Type.systemBars());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
"""


def native():
    path = os.path.join('android/app/src/main/java', *PKG.split('.'), 'MainActivity.java')
    open(path, 'w').write(MAIN % {'pkg': PKG})
    man = 'android/app/src/main/AndroidManifest.xml'
    s = open(man).read()
    if 'android.permission.VIBRATE' not in s:
        s = s.replace('</manifest>', '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>')
    open(man, 'w').write(s)


def splash():
    from PIL import Image
    os.makedirs('assets', exist_ok=True)
    logo = Image.open(os.path.join(ROOT, 'art/ui/logo.png')).convert('RGBA')
    for name in ('splash.png', 'splash-dark.png'):
        im = Image.new('RGBA', (2732, 2732), BG)
        im.alpha_composite(logo, ((2732 - logo.width) // 2, (2732 - logo.height) // 2))
        im.convert('RGB').save(os.path.join('assets', name))


if __name__ == '__main__':
    {'config': config, 'native': native, 'splash': splash}[sys.argv[1]]()
