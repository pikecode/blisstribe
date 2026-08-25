import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const roots = [
  join(process.cwd(), 'apps/miniapp/dist/dev/mp-weixin'),
  join(process.cwd(), 'apps/miniapp/dist/build/mp-weixin'),
]
const sourceMapRoots = [
  join(process.cwd(), 'apps/miniapp/dist/dev/.sourcemap'),
  join(process.cwd(), 'apps/miniapp/dist/build/.sourcemap'),
]

const watchMode = process.argv.includes('--watch')

function walk(dir, visit) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    const stat = statSync(file)
    if (stat.isDirectory()) walk(file, visit)
    else visit(file)
  }
}

function stripSourcemap() {
  let patched = 0

  for (const root of roots) {
    walk(root, (file) => {
      if (!file.endsWith('.js')) return
      const content = readFileSync(file, 'utf8')
      const next = content.replace(/\n?\/\/# sourceMappingURL=.*\.map\s*$/gm, '')
      if (next !== content) {
        writeFileSync(file, next)
        patched += 1
      }
    })
  }

  for (const root of sourceMapRoots) {
    if (existsSync(root)) rmSync(root, { recursive: true, force: true })
  }

  return patched
}

if (watchMode) {
  console.log('正在监听并清理 HBuilderX 小程序 sourcemap，按 Ctrl+C 结束')
  let lastLogAt = 0
  setInterval(() => {
    const patched = stripSourcemap()
    if (patched > 0 || Date.now() - lastLogAt > 30000) {
      console.log(`已清理小程序 sourcemap 引用: ${patched} 个 JS 文件`)
      lastLogAt = Date.now()
    }
  }, 1000)
} else {
  const patched = stripSourcemap()
  console.log(`已清理小程序 sourcemap 引用: ${patched} 个 JS 文件`)
}
