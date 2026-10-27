// Identity lifecycle only. Access-token renewal within a session does not increment this.
let attempt = 0;
export function getSessionAttempt(): number {
  return attempt;
}
export function beginSessionAttempt(): number {
  return ++attempt;
}
