---
title: Obsidian同步配置与使用指南
created: 2026-10-14
updated: 2026-10-14
tags:
  - Obsidian
  - 知识管理
  - 多设备同步
---

# Obsidian 同步配置与使用指南

这份指南用于两台 Mac、一台 Windows 和一台 iPhone 的日常配置与使用。笔记保留在本地，通过 Remotely Save 加密同步到自己的服务器。

当前 Mac 已完成配置和实际同步验证；另外三台设备按本文接入。所有设备看到同一个知识库，使用独立登录账号和相同的加密口令。

## 1. 配置总览

| 配置 | 当前值 |
| --- | --- |
| Obsidian 插件 | Remotely Save |
| 同步服务类型 | WebDAV |
| 服务器地址 | `https://notes.ompeak.com/` |
| 身份认证 | Basic／基本认证 |
| 远程基础目录 | `obsidian-vault` |
| 本地知识库名称 | `obsidian-vault` |
| 同步方向 | 双向同步／Bidirectional |
| 加密方式 | `rclone-base64` |
| 自动同步间隔 | 5 分钟 |
| 启动后同步 | 10 秒 |
| 保存后同步 | 启用；当前版本针对正在打开的笔记约 3 秒节流处理 |
| 同步 Obsidian 配置目录 | 关闭 |
| 同步书签 | 关闭 |
| 同步以下划线开头的内容 | 开启 |
| 大文件 | 预配置跳过大于 50 MiB 的附件；界面选择 50 MB 时按界面值执行 |

地址填写到域名根目录，远程基础目录单独填写。不要同时将 `obsidian-vault` 加到服务器地址后面，否则可能连接到错误目录。

## 2. 两种密码分别是什么

| 配置 | 用途 | 从哪里取值 |
| --- | --- | --- |
| WebDAV 登录密码 | 登录服务器，读取和上传文件 | 设备 JSON 的 `webdav.password` |
| 加密口令／加密密码 | 在设备上加密和解密笔记 | 设备 JSON 顶层的 `password` |

登录密码每台设备不同；加密口令所有设备相同。不要把两者填反，不要在某一设备单独修改加密口令。

本文只记录配置字段和查找方式。完整密码保存在 Mac 的私密配置文件里，不写进被同步的笔记。

## 3. 密码与配置文件在哪里

在已经配置好的 Mac 上，打开 Finder，按 `⌘⇧G`，粘贴：

```text
/Users/peakom/.config/obsidian-webdav/
```

按设备选择文件：

| 设备 | 用户名 | 配置文件 |
| --- | --- | --- |
| 当前 Mac | `notes-mac-main` | `mac-main-plugin-settings.json` |
| 第二台 Mac | `notes-mac-second` | `mac-second-plugin-settings.json` |
| Windows | `notes-windows` | `windows-plugin-settings.json` |
| iPhone | `notes-iphone` | `iphone-plugin-settings.json` |

用文本编辑器打开对应 JSON。以下只是字段位置示例，实际密码从你的文件复制：

```json
{
  "serviceType": "webdav",
  "webdav": {
    "address": "https://notes.ompeak.com/",
    "username": "notes-iphone",
    "password": "此处是 iPhone 登录密码",
    "authType": "basic",
    "remoteBaseDir": "obsidian-vault"
  },
  "password": "此处是所有设备共用的加密口令",
  "encryptionMethod": "rclone-base64",
  "syncDirection": "bidirectional"
}
```

只复制引号内部的密码内容，不复制引号；不要加空格、换行或改变大小写。

配置包放在同一私密目录的 `device-packages/` 下，包括：

- `mac-second-obsidian-sync.zip`
- `windows-obsidian-sync.zip`
- `iphone-obsidian-sync.zip`

包中配置文件的路径为 `.obsidian/plugins/remotely-save/data.json`。它与设备 JSON 内容相同，可以解压后查看。配置包含密码，通过 AirDrop 等私密方式传输，不放入知识库，不公开发送。

## 4. iPhone 配置步骤

### 4.1 创建知识库

1. 安装并打开 Obsidian。
2. 创建知识库，名称填写 `obsidian-vault`。
3. 关闭“储存在 iCloud／Store in iCloud”，使用本地知识库。
4. 首次接入优先使用空知识库。已有其他笔记时先备份，不直接覆盖原知识库。

### 4.2 安装插件

1. 打开 Obsidian 设置。
2. 进入第三方插件／Community plugins，允许使用社区插件。
3. 浏览插件，搜索 `Remotely Save`，安装并启用。
4. 进入 Remotely Save 设置。

界面语言和版本可能不同，以字段含义为准。手机不必先把 JSON 放进隐藏目录，可以在设置中逐项填写。

### 4.3 填写 iPhone 参数

将 `iphone-plugin-settings.json` 通过 AirDrop 传到 iPhone，打开文件查看，或在 Mac 上查看并填写手机设置。

| 手机插件设置 | 填写内容 |
| --- | --- |
| 选择远程服务 | WebDAV |
| 服务器地址／Server address | `https://notes.ompeak.com/` |
| 用户名／Username | `notes-iphone` |
| 登录密码／Password（WebDAV 区域） | JSON 的 `webdav.password` |
| 认证类型／Authentication | Basic |
| 远程基础目录／Remote base directory | `obsidian-vault` |
| 加密密码／Encryption password | JSON 顶层的 `password` |
| 加密方式（若有选项） | `rclone-base64`，与电脑保持一致 |
| 同步方向 | 双向同步 |

随后设置每 5 分钟自动同步、启动后 10 秒同步及保存后同步。不要启用同步 `.obsidian` 配置目录，保留手机自己的布局和账号。

若插件提供“检查连接”，先执行检查。首次同步前确认加密口令已经填写；连接成功只证明登录可用，还需要同步一篇笔记确认能够解密。

### 4.4 首次同步与验收

1. 执行 Remotely Save 的“开始同步／Start sync”。可以点击同步图标或从命令列表选择。
2. 保持 Obsidian 在前台，等待完成提示；首次同步期间不要反复点击或关闭应用。
3. 在笔记列表找到 `03-Areas/知识管理/Obsidian同步配置与使用指南.md`，确认内容可以正常阅读。
4. 再检查 `04-Resources/产品设计与开发/从需求确认到可点击原型的方法.md`。
5. 在 iPhone 创建“iPhone 同步验证”笔记，写一行文字并同步。
6. 在 Mac 同步并查看这行文字；追加另一行，再在 iPhone 同步查看。
7. 两边都看到对方的修改后，说明双向同步已完成实际验证。

手机可能暂停后台运行，离开应用前等待同步完成；不能只凭已经填写自动同步间隔就认为后台一直在同步。

## 5. 第二台 Mac 和 Windows 配置

### 使用配置包

1. 安装 Obsidian，创建本地知识库 `obsidian-vault`。
2. 知识库目录不要放在 iCloud、OneDrive 或其他自动同步目录。
3. 备份已有笔记，首次接入优先使用空知识库。
4. 安装 Remotely Save，正常退出 Obsidian。
5. 解压对应设备包，把 `.obsidian/plugins/remotely-save/` 放到知识库的同一路径。
6. 重新打开 Obsidian并启用插件，核对用户名为本设备账号。
7. 首次手动同步，检查指南和方法文档，然后做一次双向编辑验证。

隐藏目录显示方法：Mac Finder 按 `⌘⇧.`；Windows 资源管理器开启“显示 → 隐藏的项目”。

也可以按 iPhone 的字段表手工填写，换用本设备 JSON 中的用户名和登录密码。所有设备的服务器地址、远程目录和加密口令相同。

Windows 使用 Obsidian 插件连接即可，无需映射网络驱动器。同步主题、插件和布局当前关闭，需要时在每台设备分别设置。

## 6. 日常怎么用

### 开始使用一台设备

打开 Obsidian，等待同步完成，再打开要编辑的笔记。急于确认最新内容时执行一次手动同步。

### 编辑和换设备

在当前设备编辑，保存后等待同步完成，再转到另一设备。另一设备先同步，再继续编辑同一篇笔记。尽量避免两台设备同时离线修改同一篇内容。

### 离线使用

没有网络时仍可以编辑本地笔记。恢复网络后打开应用并同步，再到其他设备编辑。

### 从项目 docs 写入 Obsidian

项目文档需要先复制或更新到本机知识库。这一步不会因为配置了服务器同步就自动完成。完成后手动同步一次，或等待运行期间每 5 分钟的周期同步。

当前版本保存后同步检查正在打开的笔记；脚本写入、外部编辑器修改或没有活动笔记时，不能保证立即触发保存后同步。

### 删除笔记

删除也会同步到其他设备。误删或出现冲突时，先保留本地内容，联系处理备份恢复，不继续反复删除或清空服务器目录。

## 7. 常见问题

| 现象 | 检查和处理 |
| --- | --- |
| 登录失败、401 | 核对本设备用户名和 `webdav.password`，不是顶层加密口令 |
| 连接成功，但解密失败 | 核对顶层 `password` 和加密方式，保留现有文件 |
| 同步完成却没有笔记 | 检查远程基础目录为 `obsidian-vault`，地址没有重复目录 |
| 手机没更新 | 回到前台，执行手动同步并等待完成 |
| 外部写入的文档未立即上传 | 手动同步或等待周期同步，不依赖保存事件 |
| 大附件没同步 | 检查文件是否超过当前大文件阈值 |
| 大量修改保护阻止同步 | 先备份并查看同步计划，不直接关闭保护或重置远程数据 |
| 同一篇内容发生冲突 | 两边先保存副本，比较内容再决定；免费版不保证自动合并 |
| 在浏览器打开域名要求登录 | 正常，WebDAV 有账号认证；浏览器登录不是配置 Obsidian 的必要步骤 |
| 浏览器看到无法阅读的文件 | 正常，服务器保存加密副本，笔记由插件下载后解密 |

## 8. 备份与实际配置位置

- 本机知识库：`/Users/peakom/Documents/obsidian-vault`。
- 本机配置前备份：`/Users/peakom/.config/obsidian-webdav/backups/`。
- 服务器：`47.92.236.28`，SSH 配置名 `mcp-ompeak`。
- 服务器加密数据：`/var/lib/obsidian-webdav/data`。
- 服务器备份：`/var/backups/obsidian-webdav/daily`，每天北京时间 03:20 执行。
- 服务器运行服务：`obsidian-webdav`。

服务器不保存笔记加密口令。私密配置与独立备份需要妥善保管；同机服务器备份不能应对整台服务器丢失。

运维详情另见 Obsidian 中的“Obsidian自建服务器同步”笔记，项目副本位于 `docs/operations/OBSIDIAN_SELF_HOSTED_SYNC.md`。

## 9. 本次接入完成情况

- 当前 Mac：插件安装、首次加密上传、下载解密、修改与删除传播、当前打开笔记保存后自动同步已验证。
- 第二台 Mac、Windows、iPhone：配置包已准备，各设备按第 4～5 节完成首次接入和双向编辑验证。

本指南的配置已按生成的设备 JSON 核对；其他设备的实际使用结果以对应设备验证为准。
