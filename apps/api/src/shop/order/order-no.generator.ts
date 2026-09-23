export class OrderNoGenerator {
  static generate(): string {
    const now = new Date()
    const timestamp = now
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14)

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let random = ''
    for (let i = 0; i < 6; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return `SHOP-${timestamp}-${random}`
  }
}
