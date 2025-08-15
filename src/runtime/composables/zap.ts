// Minimal zap sender using LNURLp + WebLN via @getalby/sdk if available
// This does an LNURL-pay to a lightning address. It does not construct a NIP-57
// nostr zap request. It aims to provide a simple payment ("zap") path.

export interface ZapOptions {
  zapAddress: string // lightning address, e.g. name@getalby.com
  amount: number // in sats
  comment?: string
}

export interface ZapResult {
  preimage?: string
  paymentHash?: string
  invoice?: string
}
export class ZapException extends Error {
  additionalInfo: string

  // Step 3: Override the constructor
  constructor(message: string, additionalInfo: string) {
    // Call the base class constructor with the provided message
    super(message)

    // Set the name property to the class name
    this.name = this.constructor.name

    // Set the custom properties
    this.additionalInfo = additionalInfo

    // Ensure the stack trace is correct
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  // Optionally, you can add custom methods
  getErrorDetails(): string {
    return `Additional Info: ${this.additionalInfo}`
  }
}
// Resolve a lightning address into LNURLp metadata
async function resolveLightningAddress(address: string) {
  const [name, host] = address.split('@')
  if (!name || !host) {
    throw new ZapException('Invalid lightning address', `Lightning address being set ${address}. `)
  }
  const wellKnownUrl = `https://${host}/.well-known/lnurlp/${encodeURIComponent(name)}`
  const res = await fetch(wellKnownUrl)
  if (!res.ok) {
    throw new ZapException(`Failed to resolve lightning address`, `status: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return data as {
    callback: string
    maxSendable: number
    minSendable: number
    metadata: string
    commentAllowed?: number
    nostrPubkey?: string
    allowsNostr?: boolean
  }
}

// Request a pay invoice from LNURL callback
async function requestInvoice(callbackUrl: string, amountMsat: number, comment?: string) {
  const url = new URL(callbackUrl)
  url.searchParams.set('amount', String(amountMsat))
  if (comment) {
    url.searchParams.set('comment', comment)
  }
  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new ZapException(`Failed to request invoice: ${res.status}`, `test`)
  }
  const data = await res.json()
  if (data.status === 'ERROR') {
    throw new ZapException('LNURL error', `status: ${data.status} ${data.reason}`)
  }
  return data as { pr: string, routes: string[] }
}

type WebLNLike = {
  enabled?: boolean
  enable?: () => Promise<void>
  // Allow other properties/methods without forcing dependency on a specific SDK shape
  [key: string]: unknown
}

type AlbySdkShape = {
  WebLNProvider?: {
    requestProvider?: () => Promise<WebLNLike>
  }
  requestProvider?: () => Promise<WebLNLike>
  getProvider?: () => Promise<WebLNLike>
}
async function getAlbyProvider(): Promise<WebLNLike | undefined> {
  try {
    // Dynamically import to avoid SSR issues while narrowing to the subset we use
    // @ts-expect-error - dynamic import
    const albySdk: Partial<AlbySdkShape> = await import('@getalby/sdk')
    if (albySdk?.WebLNProvider?.requestProvider) {
      return await albySdk.WebLNProvider.requestProvider()
    }
    if (albySdk?.requestProvider) {
      return await albySdk.requestProvider()
    }
    if (albySdk?.getProvider) {
      return await albySdk.getProvider()
    }
  }
  catch {
    // Ignore import errors; fallback will be attempted
  }
  return undefined
}
async function ensureEnabled(webln: WebLNLike): Promise<WebLNLike> {
  if (webln && webln.enable && !webln.enabled) {
    await webln.enable()
  }
  return webln
}
async function getWindowWebLN(): Promise<WebLNLike | undefined> {
  if (typeof window !== 'undefined' && 'webln' in window) {
    // @ts-expect-error - window.webln is not typed correctly
    const webln = (window as unknown).webln as WebLNLike
    return ensureEnabled(webln)
  }
  return undefined
}

// Get a WebLN provider (try @getalby/sdk first, then fallback to window.webln)

export async function getWebLN(): Promise<WebLNLike | undefined> {
  const albyProvider = await getAlbyProvider()
  if (albyProvider) {
    return albyProvider
  }

  const windowWebLN = await getWindowWebLN()
  if (windowWebLN) {
    return windowWebLN
  }

  // Return undefined to allow callers to fallback to non-WebLN flows (e.g., lightning: deep link)
  return undefined
}

export async function sendZap({ zapAddress, amount, comment }: ZapOptions): Promise<ZapResult> {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }
  const lnurlInfo = await resolveLightningAddress(zapAddress)
  const satsToMsat = amount * 1000

  if (satsToMsat < lnurlInfo.minSendable || satsToMsat > lnurlInfo.maxSendable) {
    const min = Math.ceil(lnurlInfo.minSendable / 1000)
    const max = Math.floor(lnurlInfo.maxSendable / 1000)
    throw new Error(`Amount out of bounds. Allowed: ${min} - ${max} sats`)
  }

  const invoiceRes = await requestInvoice(lnurlInfo.callback, satsToMsat, comment)

  const webln = await getWebLN()
  if (webln) {
    // @ts-expect-error - webln is not typed correctly
    const payResult = await webln.sendPayment(invoiceRes.pr)
    // Different providers return different shapes; normalize minimal fields
    return {
      preimage: payResult?.preimage,
      paymentHash: payResult?.paymentHash || payResult?.payment_hash,
      invoice: invoiceRes.pr,
    }
  }

  // Fallback for mobile browsers without WebLN: attempt to open a lightning: deep link
  if (typeof window !== 'undefined') {
    const uri = invoiceRes.pr.startsWith('lightning:') ? invoiceRes.pr : `lightning:${invoiceRes.pr}`
    try {
      // Using location.href tends to work best across mobile browsers
      window.location.href = uri
    }
    catch {
      // Ignore navigation errors; caller can still use the returned invoice (e.g., show QR)
    }
  }

  // Return the invoice so the UI can render a QR code or show a copy/open link
  return { invoice: invoiceRes.pr }
}
