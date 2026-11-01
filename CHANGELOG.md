# Changelog

## Unreleased

Extend the Pi peer range to 0.86.x–0.87.x and pin development tests to 0.87.0. Verified restored-history rendering with pi-compact-ui 0.1.3 on macOS / Node 24 and 26; no runtime conversion changes.

将 Pi 兼容范围扩展至 0.86.x–0.87.x，开发测试固定为 0.87.0。在 macOS / Node 24、26 验证与 pi-compact-ui 0.1.3 同时加载后的历史恢复及渲染；不改变运行时转换逻辑。

## 0.1.0 — 2026-09-20

Initial release: display-only local file links for Pi. Supports existing regular files across extensions, preserves Markdown around link targets, and leaves session/model messages unchanged. Includes conservative path handling and automated Pi rendering tests.

首次发布：在 Pi 显示层补全本地文件链接，支持各种后缀的已有普通文件，保留链接周围 Markdown，不修改会话或模型消息。包含保守路径解析和 Pi 渲染自动测试。
