# pi-local-file-links

Pi 已经写好了报告，点击链接却打不开？这个扩展在显示时补全本地文件地址。

它将助手回复中的相对文件链接转换成绝对 `file://` 地址，保留链接文字。原始回复、会话记录和发给模型的上下文都不变。

[English](README.md)

## 安装

```sh
pi install npm:pi-local-file-links
```

也可以安装指定版本的 Git 源码：

```sh
pi install git:github.com/Ge-limin/pi-local-file-links@v0.1.0
```

现有 Pi 会话执行 `/reload`，新会话自动加载。

## 使用效果

假设会话目录为 `/home/me/project`，且 `docs/report.html` 已存在：

```markdown
[报告](docs/report.html)
```

屏幕上仍然显示“报告”，但终端收到的点击目标变成 `file:///home/me/project/docs/report.html`。保存的消息中仍然是 `docs/report.html`。

不限制文件后缀，MD、HTML、PDF、图片和源代码等普通文件都可以处理。具体使用什么应用打开，由终端和系统设置决定。需要 HTTP 环境的 HTML 应使用已有的 `http://localhost:…` 预览链接；本扩展不启动服务器。

## 转换范围

只处理助手完成回复中的明确 Markdown 链接，包括引用式链接和恢复后的历史显示。支持相对路径、绝对路径及 `~/` 路径；要求目标为已有普通文件。

扩展通过 Markdown 源位置仅替换链接目标，保留标签和周围排版。中文、空格、括号与 URL 编码文件名均有测试，查询参数和锚点会保留。

以下内容保持原样：代码块和行内代码、原始 HTML、裸路径、图片、已有协议地址、不存在的文件、目录、行号后缀、存在歧义的文件名，以及与图片共用的引用定义。流式输出在回复完成前也保持原样。

## 兼容性与边界

使用 Pi 的 `registerMarkdownTransformer` 接口，已在本机 macOS 验证 **Pi 0.86.0 / Node 24，以及 Pi 0.87.0 / Node 24、26**，兼容范围为 Pi 0.86.x–0.87.x。0.87 验证包含与 pi-compact-ui 0.1.3 同时加载后的历史恢复及渲染。作者此前已在 Warp 中试用；0.87 尚未重新验证终端实际点击。Windows 下停用。0.1.0 发布时 GitHub Actions 中 macOS/Linux × Node 22/24 四组自动测试均已通过；Linux 终端的实际点击行为尚未验证。

终端需支持 OSC 8 超链接和打开 `file://` URL。本扩展不保证打开程序、锚点跳转或源代码行号跳转。

相对路径以会话目录为基准，不跟随某次 shell 命令中的 `cd`。会话头记录的目录与当前目录不一致时，停用相对转换。跨工作树产物应输出绝对路径；同目录导入的跨项目历史无法通过显示接口识别。

检测到 SSH/容器环境时停用转换，但环境线索不能覆盖全部远程场景。网络挂载上的同步文件元数据检查可能较慢。扩展不读取或上传文件内容。

超过 100,000 字符或 128 个链接/定义节点的消息会跳过转换。有界的两秒缓存减少重复检查；Pi 本身也缓存渲染结果，因此链接出现后才创建的文件，可能需 `/reload` 才能刷新。

不增加工具、提示词、模型请求、遥测或服务。其他扩展仍可能独立修改消息。

## 开发与验证

```sh
npm ci --ignore-scripts
npm test
npm run test:pi
npm pack --dry-run
```

单元测试覆盖语法、编码、歧义和目录变化。真实 Pi 集成测试会加载扩展、保存并恢复测试会话、在不同宽度下检查 OSC 8 链接，同时比较会话文件字节和 `convertToLlm` 输出，验证显示转换不影响消息内容。测试不调用模型。

测试其他已安装 Pi 版本：

```sh
PI_PACKAGE_ROOT=/path/to/node_modules/@earendil-works/pi-coding-agent npm test
```

## 卸载

```sh
pi remove npm:pi-local-file-links
```

Git 安装则使用 `pi remove git:github.com/Ge-limin/pi-local-file-links`，之后执行 `/reload`。

## 许可证

[MIT](LICENSE)
