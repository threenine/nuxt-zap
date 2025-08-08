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

// Resolve a lightning address into LNURLp metadata
async function resolveLightningAddress(address: string) {
  const [name, host] = address.split('@')
  if (!name || !host) {
    throw new Error('Invalid lightning address')
  }
  const wellKnownUrl = `https://${host}/.well-known/lnurlp/${encodeURIComponent(name)}`
  const res = await fetch(wellKnownUrl)
  if (!res.ok) {
    throw new Error(`Failed to resolve lightning address: ${res.status}`)
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
    throw new Error(`Failed to request invoice: ${res.status}`)
  }
  const data = await res.json()
  if (data.status === 'ERROR') {
    throw new Error(data.reason || 'LNURL error')
  }
  return data as { pr: string; routes: any[] }
}

// Get a WebLN provider (try @getalby/sdk first, then fallback to window.webln)
async function getWebLN() {
  try {
    // Dynamically import to avoid SSR issues; use any to avoid type dependency on exact SDK API shape
    const sdk: any = await import('@getalby/sdk')
    // Common names used in SDK for browser webln provider
    if (sdk?.WebLNProvider?.requestProvider) {
      return await sdk.WebLNProvider.requestProvider()
    }
    if (sdk?.requestProvider) {
      return await sdk.requestProvider()
    }
    if (sdk?.getProvider) {
      return await sdk.getProvider()
    }
  }
  catch (e) {
    // ignore and fallback
  }
  if (typeof window !== 'undefined' && (window as any).webln) {
    const webln = (window as any).webln
    if (!webln.enabled && webln.enable) {
      await webln.enable()
    }
    return webln
  }
  throw new Error('No WebLN provider available. Install Alby or enable WebLN.')
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
  const payResult = await webln.sendPayment(invoiceRes.pr)
  // Different providers return different shapes; normalize minimal fields
  return {
    preimage: payResult?.preimage,
    paymentHash: payResult?.paymentHash || payResult?.payment_hash,
    invoice: invoiceRes.pr,
  }
}
