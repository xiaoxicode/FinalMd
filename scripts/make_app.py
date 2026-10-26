#!/usr/bin/env python3
"""手工打包 macOS 应用（绕开 packager 对删除 default_app.asar 的依赖）。
渲染层已由 esbuild 打成自包含 bundle，因此 app 内无需 node_modules。
"""
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_APP = os.path.join(ROOT, 'node_modules', 'electron', 'dist', 'Electron.app')
OUT_DIR = os.path.join(ROOT, 'build')
APP_NAME = '墨写 Markdown.app'
DST_APP = os.path.join(OUT_DIR, APP_NAME)
BUNDLE_ID = 'cn.moxie.markdown'
VERSION = '1.0.0'

log = lambda *a: print(*a, flush=True)


def step(msg):
    log('→', msg)


def main():
    if not os.path.isdir(SRC_APP):
        log('错误：未找到 Electron.app：', SRC_APP)
        return 1

    os.makedirs(OUT_DIR, exist_ok=True)
    if os.path.isdir(DST_APP):
        # 逐项移除（沙箱禁止整树删除时退化为重命名）
        shutil.rmtree(DST_APP, ignore_errors=True)
    if os.path.isdir(DST_APP):
        backup = DST_APP + '.old-' + str(int(os.path.getmtime(DST_APP)))
        os.rename(DST_APP, backup)
        log('   已存在的产物移为', os.path.basename(backup))

    step('复制 Electron.app（保留符号链接，约需 1 分钟）')
    # 跳过自带的示例应用（沙箱也不允许复制该文件）
    shutil.copytree(SRC_APP, DST_APP, symlinks=True,
                    ignore=shutil.ignore_patterns('default_app.asar'))

    # 1) 图标
    step('替换应用图标')
    icns = os.path.join(ROOT, 'assets', 'icon.icns')
    res = os.path.join(DST_APP, 'Contents', 'Resources')
    if os.path.exists(icns):
        shutil.copyfile(icns, os.path.join(res, 'electron.icns'))
        log('   图标', os.path.getsize(icns), '字节')
    else:
        log('   ⚠ 未找到 assets/icon.icns，沿用默认图标')

    # 2) 放入我们的代码
    step('写入应用代码 Contents/Resources/app')
    app_dir = os.path.join(res, 'app')
    os.makedirs(app_dir, exist_ok=True)
    for f in ['main.js', 'preload.js', 'updater.dist.js']:
        shutil.copyfile(os.path.join(ROOT, f), os.path.join(app_dir, f))
    shutil.copytree(os.path.join(ROOT, 'renderer'), os.path.join(app_dir, 'renderer'),
                    ignore=shutil.ignore_patterns('src'))
    pkg = {
        'name': 'markdown-writer',
        'productName': '墨写 Markdown',
        'version': VERSION,
        'description': '所见即所得的 Markdown 写作器',
        'main': 'main.js',
        'author': '',
        'license': 'ISC',
    }
    with open(os.path.join(app_dir, 'package.json'), 'w', encoding='utf-8') as fp:
        json.dump(pkg, fp, ensure_ascii=False, indent=2)
    log('   文件：', sorted(os.listdir(app_dir)))

    # 3) 确认没有残留的默认示例应用
    default_asar = os.path.join(res, 'default_app.asar')
    if os.path.exists(default_asar):
        os.rename(default_asar, default_asar + '.disabled')
        log('   默认示例应用已改名为 default_app.asar.disabled')
    else:
        log('   未包含默认示例应用（正确）')

    # 4) Info.plist
    step('改写 Info.plist')
    plist_path = os.path.join(DST_APP, 'Contents', 'Info.plist')
    with open(plist_path, 'r', encoding='utf-8') as fp:
        plist = fp.read()

    def set_value(text, key, value):
        import re
        pattern = r'(<key>' + re.escape(key) + r'</key>\s*)<string>[^<]*</string>'
        if re.search(pattern, text):
            return re.sub(pattern, lambda m: m.group(1) + '<string>' + value + '</string>', text, count=1)
        # 不存在则插入到首个 <dict> 之后
        return re.sub(r'(<dict>\s*)',
                      lambda m: m.group(1) + '<key>' + key + '</key><string>' + value + '</string>\n  ',
                      text, count=1)

    for key, val in [
        ('CFBundleDisplayName', '墨写 Markdown'),
        ('CFBundleName', '墨写 Markdown'),
        ('CFBundleIdentifier', BUNDLE_ID),
        ('CFBundleShortVersionString', VERSION),
        ('CFBundleVersion', VERSION),
        ('CFBundleIconFile', 'electron.icns'),
        ('CFBundleGetInfoString', '墨写 Markdown %s — 所见即所得的 Markdown 写作器' % VERSION),
        ('NSHumanReadableCopyright', ''),
        ('LSMinimumSystemVersion', '10.15'),
        ('NSHighResolutionCapable', 'true'),
    ]:
        plist = set_value(plist, key, val)

    # 支持打开 .md 文件
    if 'CFBundleDocumentTypes' not in plist:
        doc_types = '''  <key>CFBundleDocumentTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeName</key><string>Markdown Document</string>
      <key>CFBundleTypeRole</key><string>Editor</string>
      <key>LSItemContentTypes</key>
      <array><string>net.daringfireball.markdown</string><string>public.plain-text</string></array>
    </dict>
  </array>
'''
        plist = plist.replace('</dict>\n</plist>', doc_types + '</dict>\n</plist>')

    with open(plist_path, 'w', encoding='utf-8') as fp:
        fp.write(plist)
    log('   CFBundleName = 墨写 Markdown, ID =', BUNDLE_ID)

    # 5) 清理隔离属性（保留 Electron 官方签名结构，仅去除下载标记）
    step('清除隔离属性并做 ad-hoc 签名')
    subprocess.run(['xattr', '-cr', DST_APP], capture_output=True)
    r = subprocess.run(['codesign', '--force', '--deep', '--sign', '-', DST_APP],
                       capture_output=True, text=True)
    log('   codesign rc=', r.returncode, (r.stderr or '').strip()[:160])
    if r.returncode != 0:
        # 退化为逐个签名
        base = os.path.join(DST_APP, 'Contents', 'Frameworks', 'Electron Framework.framework')
        targets = [
            os.path.join(base, 'Versions', 'A', 'Electron Framework'),
            os.path.join(base, 'Versions', 'A', 'Libraries', 'libffmpeg.dylib'),
            os.path.join(base, 'Versions', 'A', 'Helpers', 'Electron Helper.app'),
        ]
        for t in targets:
            if os.path.exists(t):
                subprocess.run(['codesign', '--force', '--sign', '-', t], capture_output=True)
        r2 = subprocess.run(['codesign', '--force', '--sign', '-', DST_APP],
                            capture_output=True, text=True)
        log('   逐个签名 rc=', r2.returncode, (r2.stderr or '').strip()[:160])

    size = subprocess.run(['du', '-sh', DST_APP], capture_output=True, text=True).stdout.split()[0]
    log('\n✅ 打包完成：', DST_APP, '（' + size + '）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
