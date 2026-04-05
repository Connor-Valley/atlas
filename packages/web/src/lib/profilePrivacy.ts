export type ProfileVisibility = 'public' | 'friends_only' | 'private';

export const PROFILE_VISIBILITY_OPTIONS: Array<{
  value: ProfileVisibility;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can view your profile content.',
    icon: 'mdi-earth',
  },
  {
    value: 'friends_only',
    label: 'Friends only',
    description: 'Only accepted friends can view your profile content.',
    icon: 'mdi-account-group-outline',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can view your profile content.',
    icon: 'mdi-lock-outline',
  },
];

export function getProfileVisibilityMeta(visibility: ProfileVisibility) {
  return PROFILE_VISIBILITY_OPTIONS.find((option) => option.value === visibility) ?? PROFILE_VISIBILITY_OPTIONS[0];
}

export function canViewerAccessProfileContent(
  visibility: ProfileVisibility,
  viewerId: string | null | undefined,
  targetUserId: string,
  isFriend: boolean,
) {
  if (viewerId === targetUserId) return true;
  if (visibility === 'public') return true;
  if (visibility === 'friends_only') return isFriend;
  return false;
}

export function getProfileVisibilityNotice(
  visibility: ProfileVisibility,
  isSignedIn: boolean,
) {
  if (visibility === 'private') {
    return {
      title: 'This account is private',
      description: 'Only this user can view their saved cities, comparisons, and profile details.',
    };
  }

  if (visibility === 'friends_only') {
    return {
      title: 'This account is friends only',
      description: isSignedIn
        ? 'Only accepted friends can view this profile’s saved cities, comparisons, and profile details.'
        : 'Sign in and become friends with this user to view their saved cities, comparisons, and profile details.',
    };
  }

  return {
    title: 'This profile is visible',
    description: 'Anyone can view this account’s saved cities, comparisons, and profile details.',
  };
}
