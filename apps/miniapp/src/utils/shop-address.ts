export function splitAddress(address: string): { region: string[]; detail: string } {
  const separator = address.indexOf('\n')
  const region = address.slice(0, separator).split(' ')
  // 仅拆分本页面保存的格式，旧地址原样保留，避免猜测行政区造成地址丢失。
  if (separator < 0 || region.length !== 3 || region.some((item) => !item)) {
    return { region: [], detail: address }
  }
  return { region, detail: address.slice(separator + 1) }
}

export function joinAddress(region: string[], detail: string): string {
  return `${region.join(' ')}\n${detail.trim()}`
}
