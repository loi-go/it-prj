export type ProfileFlags = {
  is_admin?: boolean | null
  is_caller?: boolean | null
}

export function isProfileAdmin(profile: ProfileFlags) {
  return profile.is_admin === true
}

export function isProfileCaller(profile: ProfileFlags) {
  return profile.is_caller === true && !isProfileAdmin(profile)
}

export function getHomePathForProfile(profile: ProfileFlags) {
  if (isProfileCaller(profile)) return '/interviews'
  return '/standups'
}

const CALLER_BLOCKED_PATHS = ['/standups', '/interviews/all', '/admin'] as const

export function isCallerBlockedPath(pathname: string) {
  return CALLER_BLOCKED_PATHS.some(
    path => pathname === path || pathname.startsWith(`${path}/`)
  )
}
