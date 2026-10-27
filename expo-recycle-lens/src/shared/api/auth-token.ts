type AccessTokenGetter = () => string | null;
type UnauthorizedHandler = () => Promise<void> | void;

let getAccessToken: AccessTokenGetter = () => null;
let onUnauthorized: UnauthorizedHandler = () => undefined;
let unauthorizedPromise: Promise<void> | null = null;

export function registerAccessTokenGetter(getter: AccessTokenGetter) {
  getAccessToken = getter;
}

export function readAccessToken(): string | null {
  return getAccessToken();
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

export async function notifyUnauthorized() {
  if (!unauthorizedPromise) {
    unauthorizedPromise = Promise.resolve(onUnauthorized()).finally(() => {
      unauthorizedPromise = null;
    });
  }

  return unauthorizedPromise;
}

export function resetAuthTokenBindings() {
  getAccessToken = () => null;
  onUnauthorized = () => undefined;
  unauthorizedPromise = null;
}
