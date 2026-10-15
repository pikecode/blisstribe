# Obsidian 自建服务器同步

配置日期：2026-10-14。设备范围：两台 Mac、一台 Windows、一台 iPhone。

采用 Remotely Save + HTTPS WebDAV，知识库在各设备保留本地文件，服务器保存客户端加密后的副本。项目文档写入 Obsidian 与设备之间的同步是两个步骤：项目文档仍需先更新本地笔记，之后由插件同步到其他设备。

## 1. 已部署配置

| 项目 | 配置 |
| --- | --- |
| 同步地址 | `https://notes.ompeak.com/` |
| 服务器 | `47.92.236.28` |
| SSH | `mcp-ompeak` |
| 客户端插件 | Remotely Save 0.5.25 |
| 服务方式 | WebDAV，Basic 登录 + HTTPS + 客户端加密 |
| 远程目录 | `obsidian-vault`，所有设备保持一致 |
| 建议本地知识库名称 | `obsidian-vault` |
| 本机知识库 | `/Users/peakom/Documents/obsidian-vault` |
| 服务 | `obsidian-webdav.service` |
| 后端监听 | `127.0.0.1:18765`，不直接暴露公网 |
| WebDAV 实现 | Ubuntu 软件源 rclone 1.60.1+dfsg-4ubuntu3.2 |
| 远程数据目录 | `/var/lib/obsidian-webdav/data` |
| 服务认证文件 | `/etc/obsidian-webdav/htpasswd`，只保存密码哈希 |
| Nginx 配置 | `/etc/nginx/sites-available/notes.ompeak.com` |
| HTTPS 证书 | `/etc/letsencrypt/live/notes.ompeak.com/` |
| 备份 | `obsidian-webdav-backup.timer`，北京时间每日 03:20 |

这是独立的笔记同步服务器，不是本项目应用部署服务器 `blisstribe-prod`。运维时按表中的 SSH 和目录执行。

## 2. 客户端同步规则

- 双向同步：每台设备都可以编辑笔记。
- 使用相同远程目录与相同加密口令，各设备使用独立登录账号。
- 本机官方 Sync 已关闭，使用 Remotely Save 同步笔记。
- 启动后约 10 秒同步、启用保存后同步（该版本对当前打开笔记的变更约 3 秒节流处理）、运行期间每 5 分钟同步。
- 同步普通笔记、附件及以下划线开头的资源；不传 `.git`、`.obsidian` 和 `.DS_Store`。
- 大于 50 MiB 的附件按当前预配置跳过，插件界面手动选择 50 MB 时以界面阈值为准。
- 主题、插件、设备布局和同步密码配置不随笔记同步，每台设备单独维护。
- 冲突使用免费版的保留较新文件策略，不保证同时编辑的内容自动合并。切换设备前先同步，遇到冲突先备份并核对。
- 删除笔记会传播到其他设备；同步不能替代备份。
- iPhone 后台运行受系统限制，使用前和离开前打开 Obsidian 并确认同步完成。

不要同时启用 iCloud、官方 Sync、Git 定时推拉或其他插件来同步同一个知识库。Git 可保留为手动版本备份。

## 3. 私密配置位置

本机私密目录：`/Users/peakom/.config/obsidian-webdav/`，目录权限为 700，配置文件和配置包权限为 600。

| 文件 | 用途 |
| --- | --- |
| `credentials.json` | 四设备的账号密码和共享加密口令 |
| `mac-main-plugin-settings.json` | 当前 Mac 的配置 |
| `mac-second-plugin-settings.json` | 第二台 Mac 的配置 |
| `windows-plugin-settings.json` | Windows 的配置 |
| `iphone-plugin-settings.json` | iPhone 的配置 |
| `device-packages/` | 各设备接入包，包含插件文件、配置及接入说明 |
| `backups/` | 切换同步方式前的本地完整知识库备份 |

配置包中包含密码，不能提交到 Git、放进被同步的知识库或公开分享。通过私密方式传给对应设备，接入后妥善保管或删除传输副本。

账号分别为 `notes-mac-main`、`notes-mac-second`、`notes-windows`、`notes-iphone`，共享同一份知识库。独立账号用于单设备撤销访问，不代表相互隔离的数据权限。

服务端没有加密口令。遗失加密口令时不能从服务器恢复笔记明文，应保留本机私密配置和独立备份。修改加密口令需要迁移远程加密数据，不能在单设备直接更换。

## 4. 第二台 Mac 和 Windows 接入

1. 安装 Obsidian，创建本地知识库 `obsidian-vault`，目录不要放进 iCloud 或其他云盘同步目录。
2. 有已有笔记时先独立备份，优先用新建空知识库完成第一次下载。
3. 从 Obsidian 社区插件安装 Remotely Save；复制配置文件前正常退出 Obsidian。
4. 私密传输对应设备包，将包内 `.obsidian/plugins/remotely-save/` 放到知识库同一路径。不要复制其他设备的整个 `.obsidian`。
5. 打开 Obsidian，关闭官方 Sync 和其他自动同步方式，启用 Remotely Save。
6. 核对地址、远程目录、登录账号与加密口令，首次手动执行“开始同步”。
7. 检查 `04-Resources/产品设计与开发/从需求确认到可点击原型的方法.md` 已下载。
8. 新建一条验证笔记，保存并等待同步；在本机 Mac 查看，再反向修改一次，确认双向同步。

Windows 不需要把 WebDAV 映射为网络盘，也不需要调整注册表的 HTTP 认证选项，插件直接使用 HTTPS 连接。

## 5. iPhone 接入

1. 安装 Obsidian，创建本地知识库 `obsidian-vault`，关闭“储存在 iCloud”选项。
2. 在第三方插件中安装并启用 Remotely Save。
3. 根据 `iphone-plugin-settings.json` 在插件设置中填写 WebDAV 地址、账号、密码、认证方式 Basic、远程目录 `obsidian-vault` 和加密口令。
4. 启用双向同步，保持相同的加密方式 `rclone-base64`；不启用同步配置目录。
5. 首次先手动同步并检查方法文档，再设置自动同步、保存后同步和启动同步。
6. 保持应用在前台等待首次同步完成，新增笔记并到电脑验证。

若使用插件配置导入功能，导入后仍需检查设备登录账号。配置二维码或导出内容包含敏感信息，仅私下传输。

## 6. 已完成的验证

- 公共 HTTPS 证书有效；未登录返回 401，四台设备账号认证后的 PROPFIND 返回 207。
- WebDAV 创建目录、中文内容写入读取、列举、重命名和删除检查通过。
- 本机真实 Remotely Save 插件首次上传完成；验证时 24 个远程文件全部有 RCLONE 加密头，明文 Markdown 文件数为 0。
- 临时验证笔记由插件加密上传、更新；将其远程加密版本更新后，插件下载并解密得到预期内容。
- 删除传播验证通过，临时验证笔记已清理。
- 官方 Sync 已关闭，插件载入及独立账号检查完成。

本机在打开临时笔记并编辑后自动上传成功，验证阶段没有调用手动同步命令；临时笔记已清理。保存后同步针对当前打开的笔记；从其他程序写入 Obsidian 的文档可能依靠周期同步或手动同步上传。另一台 Mac、Windows 和 iPhone 的实际接入仍需在对应设备完成，不因服务器账号可用就视为设备已验收。

## 7. 备份与运维

服务器每日备份加密数据及服务配置，目录为 `/var/backups/obsidian-webdav/daily`。备份文件不公开，不自动删除旧备份；定期查看空间并将重要备份复制到另一位置。服务器上的同机备份不能应对整台服务器丢失。

配置前已将本机知识库完整备份到私密目录 `backups/`。后续仍应保持独立本地或异地备份。

查看状态：

```bash
ssh mcp-ompeak 'systemctl is-active obsidian-webdav'
ssh mcp-ompeak 'systemctl list-timers obsidian-webdav-backup.timer --no-pager'
ssh mcp-ompeak 'df -h /'
```

手动生成服务器备份：

```bash
ssh mcp-ompeak 'systemctl start obsidian-webdav-backup.service'
```

查看服务错误，不复制账号密码或笔记内容：

```bash
ssh mcp-ompeak 'journalctl -u obsidian-webdav --since "30 minutes ago" --no-pager -p err'
```

Certbot 已配置自动续期和验证后重载 Nginx 的钩子，证书初次有效期截止到 2027-01-12。保持域名解析及 80 端口验证路径可达。

首次创建前的 Nginx 配置备份位于 `/var/backups/obsidian-webdav/pre-deployment`。停止同步服务前先在客户端暂停同步；恢复备份涉及覆盖笔记，需要单独确认恢复时间点并保留现有数据，不直接套用覆盖命令。

## 8. 使用方式与问题处理

- 上传方法文档：先更新项目 `docs`，再同步副本到本机 Obsidian，等待插件同步；其他设备打开后等待下载。
- 密码错误：核对设备对应账号；修改登录密码只影响对应账号，与加密口令不同。
- 无法解密：先检查所有设备的加密口令与方式，保留文件，不删除远程目录重建。
- 新设备下载为空：确认远程目录一致，不只核对知识库名称。
- 大量删除或修改被保护机制阻止：先查看计划并备份，不直接关闭 50% 修改保护。
- 手机未及时同步：回到应用前台，执行手动同步并观察完成提示。

## 9. 参考

- [Remotely Save 项目与设置说明](https://github.com/remotely-save/remotely-save)
- [rclone WebDAV 服务说明](https://rclone.org/commands/rclone_serve_webdav/)
- [Obsidian 多设备同步说明](https://obsidian.md/help/sync-notes)

沿用文件同步和现有 Nginx、systemd，避免新增完整网盘平台，符合 KISS；四设备共用相同目录和加密规则，符合 DRY。
