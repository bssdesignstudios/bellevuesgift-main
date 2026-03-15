export function isPOSDomain(): boolean {
  return window.location.hostname === 'bellevuepos.cloud';
}

export function isStorefrontDomain(): boolean {
  return !isPOSDomain();
}
