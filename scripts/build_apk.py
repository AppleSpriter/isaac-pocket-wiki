"""Build a local, debug-signed APK with official Android SDK tools; no Gradle needed."""
from pathlib import Path
import os, subprocess, shutil, zipfile, hashlib, sys

ROOT=Path(__file__).resolve().parents[1]
SDK=Path(os.environ.get('ANDROID_SDK_ROOT',ROOT/'.tools/android-sdk'))
JDK=Path(os.environ.get('ISAAC_JAVA_HOME',ROOT/'.tools/jdk-17.0.20.1+1/Contents/Home'))
BT=SDK/'build-tools/35.0.0'
MAIN=ROOT/'android/app/src/main'
BUILD=ROOT/'android/app/build/manual'
OUT=ROOT/'output'

def run(*args):
    subprocess.run([str(a) for a in args],check=True,cwd=ROOT)

def main():
    for p in [BUILD/'classes',BUILD/'dex',OUT]: p.mkdir(parents=True,exist_ok=True)
    for p in [BT/'aapt2',JDK/'bin/javac',SDK/'platforms/android-35/android.jar']:
        if not p.exists(): sys.exit(f'Missing tool: {p}. See README.md.')
    android_jar=SDK/'platforms/android-35/android.jar'
    run(BT/'aapt2','compile','--dir',MAIN/'res','-o',BUILD/'resources.zip')
    run(BT/'aapt2','link','-o',BUILD/'resources.apk','--manifest',MAIN/'AndroidManifest.xml','-I',android_jar,'--min-sdk-version','26','--target-sdk-version','35','-A',ROOT/'web',BUILD/'resources.zip')
    run(JDK/'bin/javac','--release','8','-encoding','UTF-8','-classpath',android_jar,'-d',BUILD/'classes',*MAIN.glob('java/**/*.java'))
    run(JDK/'bin/java','-cp',BT/'lib/d8.jar','com.android.tools.r8.D8','--min-api','26','--lib',android_jar,'--output',BUILD/'dex',*(BUILD/'classes').glob('**/*.class'))
    shutil.copyfile(BUILD/'resources.apk',BUILD/'unsigned.apk')
    with zipfile.ZipFile(BUILD/'unsigned.apk','a',zipfile.ZIP_DEFLATED) as apk:
        for dex in (BUILD/'dex').glob('*.dex'):apk.write(dex,dex.name)
    run(BT/'zipalign','-f','-p','4',BUILD/'unsigned.apk',BUILD/'aligned.apk')
    keystore=ROOT/'.tools/isaac-debug.keystore'
    if not keystore.exists():
        run(JDK/'bin/keytool','-genkeypair','-keystore',keystore,'-storepass','android','-keypass','android','-alias','androiddebugkey','-dname','CN=Isaac Pocket Local Debug,O=Local,C=CN','-keyalg','RSA','-keysize','2048','-validity','10000')
    final=OUT/'isaac-pocket-0.4.1-debug.apk'
    run(JDK/'bin/java','-jar',BT/'lib/apksigner.jar','sign','--ks',keystore,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',final,BUILD/'aligned.apk')
    run(JDK/'bin/java','-jar',BT/'lib/apksigner.jar','verify','--verbose',final)
    digest=hashlib.sha256(final.read_bytes()).hexdigest()
    (OUT/'SHA256SUMS.txt').write_text(f'{digest}  {final.name}\n')
    print(f'APK: {final} ({final.stat().st_size:,} bytes)')

if __name__=='__main__':main()
