#!/usr/bin/env bash
# 独立分发发布脚本：构建 dmg → Developer ID 签名 → Apple 公证 → 校验
# 用法： ./scripts/publish-mac.sh            # 仅 arm64（Apple 芯片）
#        ./scripts/publish-mac.sh --arm64 --x64   # 同时支持 Intel Mac
set -euo pipefail
cd "$(dirname "$0")/.."

ARCH_ARGS=("$@")
if [ ${#ARCH_ARGS[@]} -eq 0 ]; then ARCH_ARGS=(--arm64); fi

echo "== 1/4 检查 Apple 凭据 =="
if [ ! -f .env ]; then
  echo "缺少 .env。请先执行： cp .env.example .env  然后填入 APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID"
  exit 1
fi
set -a; source .env; set +a
if [ -z "${APPLE_ID:-}" ] || [ -z "${APPLE_APP_SPECIFIC_PASSWORD:-}" ] || [ -z "${APPLE_TEAM_ID:-}" ]; then
  echo ".env 中三项凭据有缺失，请补齐"
  exit 1
fi
echo "   Apple ID: $APPLE_ID   Team ID: $APPLE_TEAM_ID"

echo "== 2/4 检查钥匙串中的 Developer ID 证书 =="
CERT=$(security find-identity -v -p codesigning | grep "Developer ID Application" || true)
if [ -z "$CERT" ]; then
  echo "   未找到「Developer ID Application」证书。"
  echo "   请到 developer.apple.com → Certificates 创建并下载，双击导入登录钥匙串后重试。"
  exit 1
fi
echo "$CERT" | sed 's/^/   /'

echo "== 3/4 构建、签名并公证（公证需联网，通常 1-5 分钟）=="
npm run build
# 设置了 GH_TOKEN 就顺带把 dmg/zip 与 latest-mac.yml 上传到 GitHub Release，
# 这正是 electron-updater 检查更新时读取的来源。
PUBLISH_ARGS=()
if [ -n "${GH_TOKEN:-}" ]; then
  echo "   检测到 GH_TOKEN，构建后将自动发布到 GitHub Release"
  PUBLISH_ARGS=(--publish always)
else
  echo "   未设置 GH_TOKEN，仅本地构建（设了才会上传 Release 供自动更新使用）"
fi
npx electron-builder --mac "${ARCH_ARGS[@]}" "${PUBLISH_ARGS[@]}"

echo "== 4/4 校验签名与公证结果 =="
APP=$(find release -maxdepth 3 -name "*.app" -type d | head -1)
if [ -z "$APP" ]; then
  echo "   未找到产物 .app，请检查 release/ 目录"
  exit 1
fi
echo "   产物：$APP"
codesign --verify --deep --strict --verbose=2 "$APP" 2>&1 | tail -2
echo "   Gatekeeper 评估："
spctl --assess --verbose --type exec "$APP" 2>&1 || echo "   （未被接受，用 xcrun notarytool log 查看原因）"
echo "   公证票据："
xcrun stapler validate "$APP" 2>&1 | tail -1

echo ""
echo "完成。可分发文件在 release/ 下的 .dmg（给用户的安装包）与 .zip（自动更新用）"
