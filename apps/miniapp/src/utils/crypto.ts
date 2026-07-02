// RSA 加密工具
import { JSEncrypt } from 'jsencrypt'
import { request } from '@/api/request'

interface RsaPublicKeyResponse {
  publicKey: string
  keyId?: string
}

let cachedPublicKey = ''
let cachedKeyId = ''

export async function getPublicKey(): Promise<{ publicKey: string; keyId: string }> {
  if (cachedPublicKey) {
    return { publicKey: cachedPublicKey, keyId: cachedKeyId }
  }
  // request<T> 已提取 ApiResponse.data，T 即业务数据
  const res = await request<RsaPublicKeyResponse>({
    url: '/auth/rsa-public-key',
    method: 'GET',
    skipAuthRefresh: true,
  })
  cachedPublicKey = res.publicKey
  cachedKeyId = res.keyId || ''
  return { publicKey: cachedPublicKey, keyId: cachedKeyId }
}

export async function encryptPassword(password: string): Promise<string> {
  const { publicKey } = await getPublicKey()
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(publicKey)
  const encrypted = encryptor.encrypt(password)
  if (!encrypted) throw new Error('密码加密失败')
  return encrypted
}
