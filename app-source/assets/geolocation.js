// Device coordinates stay in memory. The first request runs in the button's
// click handler, preserving the browser's user-initiated permission flow.
export function findCurrentLocation({geolocation = globalThis.navigator?.geolocation,
  secureContext = globalThis.isSecureContext, signal} = {}) {
  return new Promise((resolve, reject) => {
    let settled = false, attempt = 0;
    const finish = (error, position) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve(position);
    };
    const abort = () => finish(Object.assign(new Error('Location request cancelled'), {name: 'AbortError'}));
    if (signal?.aborted) { abort(); return; }
    if (secureContext === false) { finish({code: 'insecure'}); return; }
    if (!geolocation?.getCurrentPosition) { finish({code: 'unsupported'}); return; }
    signal?.addEventListener('abort', abort, {once: true});
    function request(highAccuracy) {
      const currentAttempt = ++attempt;
      const fail = error => {
        if (settled || currentAttempt !== attempt) return;
        // GPS can succeed when the phone's network-based fix is unavailable.
        if (!highAccuracy && (error?.code === 2 || error?.code === 3)) request(true);
        else finish(error || {code: 2});
      };
      try {
        geolocation.getCurrentPosition(position => {
          if (settled || currentAttempt !== attempt) return;
          const {latitude, longitude} = position?.coords || {};
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
              Math.abs(latitude) > 90 || Math.abs(longitude) > 180) { fail({code: 2}); return; }
          finish(null, position);
        }, fail, {enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 20000 : 12000,
          maximumAge: highAccuracy ? 0 : 60000});
      } catch (error) {
        finish({code: error?.name === 'SecurityError' || error?.name === 'NotAllowedError' ? 1 : 2});
      }
    }
    request(false);
  });
}

export function locationErrorMessage(error) {
  switch (error?.code) {
    case 'insecure': return 'Location needs a secure connection. Open the live HTTPS website in Safari or Chrome, or choose a starting town below.';
    case 'unsupported': return 'This browser cannot share your location. Open this link in Safari or Chrome, or choose a starting town below.';
    case 1: return 'Location access is blocked. Allow location for this website in your browser settings and turn on your phone’s Location Services, then try again. You can also choose a starting town below.';
    case 3: return 'Your device took too long to find a location. Check that Location Services are on, try again near a window or outdoors, or choose a starting town below.';
    default: return 'Your device could not find a location. Check your connection and Location Services, then try again, or choose a starting town below.';
  }
}
