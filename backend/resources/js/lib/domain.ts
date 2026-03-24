export function isPOSDomain(): boolean {
  return window.location.hostname === 'bellevuepos.cloud' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

export function isStorefrontDomain(): boolean {
  return !isPOSDomain();
}
