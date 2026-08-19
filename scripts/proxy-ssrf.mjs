/**
 * Shared SSRF guards for /__ai_proxy (public https only) and Piper (localhost:5000).
 */
import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

const blocked = new BlockList()
blocked.addSubnet('0.0.0.0', 8, 'ipv4')
blocked.addSubnet('10.0.0.0', 8, 'ipv4')
blocked.addSubnet('127.0.0.0', 8, 'ipv4')
blocked.addSubnet('169.254.0.0', 16, 'ipv4')
blocked.addSubnet('172.16.0.0', 12, 'ipv4')
blocked.addSubnet('192.168.0.0', 16, 'ipv4')
blocked.addAddress('::', 'ipv6')
blocked.addAddress('::1', 'ipv6')
blocked.addSubnet('fc00::', 7, 'ipv6')
blocked.addSubnet('fe80::', 10, 'ipv6')

/** @param {string} hostname */
export function normalizeHost(hostname) {
  return String(hostname || '')
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .toLowerCase()
}

/** @param {string} ip */
function mappedIpv4(ip) {
  const dotted = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)
  if (dotted) return dotted[1]
  const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i)
  if (hex) {
    const hi = parseInt(hex[1], 16)
    const lo = parseInt(hex[2], 16)
    return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`
  }
  return null
}

/** @param {string} ip */
function isBlockedIp(ip) {
  const v4 = mappedIpv4(ip)
  if (v4) return blocked.check(v4, 'ipv4')
  const kind = isIP(ip)
  if (kind === 4) return blocked.check(ip, 'ipv4')
  if (kind === 6) return blocked.check(ip, 'ipv6')
  return true
}

/** @param {string} host */
function isBlockedHostname(host) {
  return host === 'localhost' || host === 'metadata.google.internal' || host === 'internal' || host.endsWith('.internal')
}

/**
 * @param {URL} target
 * @returns {Promise<string|null>}
 */
export async function aiTargetError(target) {
  if (target.protocol !== 'https:') return 'only https targets allowed'
  const host = normalizeHost(target.hostname)
  if (!host) return 'invalid host'
  if (isIP(host)) {
    if (isBlockedIp(host)) return 'blocked host'
    return null
  }
  if (isBlockedHostname(host)) return 'blocked host'
  let addrs
  try {
    addrs = await lookup(host, { all: true })
  } catch {
    return 'unresolvable host'
  }
  if (!addrs.length || addrs.some((a) => isBlockedIp(a.address))) return 'blocked host'
  return null
}

/**
 * @param {URL} target
 * @returns {string|null}
 */
export function piperTargetError(target) {
  const host = normalizeHost(target.hostname)
  const isLocal = host === '127.0.0.1' || host === 'localhost' || host === '::1'
  const isHttp = target.protocol === 'http:' || target.protocol === 'https:'
  if (!isLocal || !isHttp) return 'only http(s) localhost targets allowed'
  const port = target.port || (target.protocol === 'https:' ? '443' : '80')
  if (port !== '5000') return 'only localhost port 5000 allowed'
  return null
}
