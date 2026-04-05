import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type FriendProfile = {
  id: string;
  username: string;
  display_name: string;
};

export type FriendRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  profile: FriendProfile;
};

export function useFriends() {
  const { user } = useAuth();

  const friends          = ref<FriendRequest[]>([]);
  const incomingRequests = ref<FriendRequest[]>([]);
  const outgoingRequests = ref<FriendRequest[]>([]);

  async function fetchAll() {
    if (!user.value) return;
    const userId = user.value.id;

    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (error || !requests || requests.length === 0) {
      friends.value          = [];
      incomingRequests.value = [];
      outgoingRequests.value = [];
      return;
    }

    // Collect the other person's ID for each request
    const otherIds = [...new Set(
      requests.map(r => r.from_user_id === userId ? r.to_user_id : r.from_user_id)
    )];

    let profileMap: Record<string, FriendProfile> = {};
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', otherIds);
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    const withProfile = (req: any): FriendRequest => ({
      ...req,
      profile: profileMap[req.from_user_id === userId ? req.to_user_id : req.from_user_id],
    });

    friends.value = requests
      .filter(r => r.status === 'accepted')
      .map(withProfile);

    incomingRequests.value = requests
      .filter(r => r.status === 'pending' && r.to_user_id === userId)
      .map(withProfile);

    outgoingRequests.value = requests
      .filter(r => r.status === 'pending' && r.from_user_id === userId)
      .map(withProfile);
  }

  async function sendFriendRequest(username: string) {
    if (!user.value) throw new Error('Not signed in.');
    const cleaned = username.toLowerCase().trim();

    // Find the target profile
    const { data: targetProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!targetProfile) throw new Error('No user found with that username.');
    if (targetProfile.id === user.value.id) throw new Error('You cannot add yourself.');

    // Check for any existing relationship between the two users
    const { data: existing } = await supabase
      .from('friend_requests')
      .select('id, status, from_user_id')
      .or(
        `and(from_user_id.eq.${user.value.id},to_user_id.eq.${targetProfile.id}),` +
        `and(from_user_id.eq.${targetProfile.id},to_user_id.eq.${user.value.id})`
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') throw new Error('You are already friends!');
      if (existing.status === 'pending' && existing.from_user_id === user.value.id) {
        throw new Error('You already sent them a friend request.');
      }
      if (existing.status === 'pending' && existing.from_user_id === targetProfile.id) {
        throw new Error('They already sent you a request — check your pending requests!');
      }
      // Declined — delete the old record so a fresh request can be sent
      if (existing.status === 'declined') {
        await supabase.from('friend_requests').delete().eq('id', existing.id);
      }
    }

    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: user.value.id,
      to_user_id: targetProfile.id,
      status: 'pending',
    });
    if (error) throw error;

    await fetchAll();
  }

  async function acceptFriendRequest(requestId: string) {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    if (error) throw error;
    await fetchAll();
  }

  async function declineFriendRequest(requestId: string) {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);
    if (error) throw error;
    await fetchAll();
  }

  async function cancelFriendRequest(requestId: string) {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);
    if (error) throw error;
    await fetchAll();
  }

  async function removeFriend(requestId: string) {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);
    if (error) throw error;
    await fetchAll();
  }

  // Targeted single-query status check — used by the public profile view
  // so it doesn't have to load all friend requests.
  async function getFriendshipStatus(targetUserId: string): Promise<{
    status: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
    requestId?: string;
  }> {
    if (!user.value) return { status: 'none' };

    const { data } = await supabase
      .from('friend_requests')
      .select('id, status, from_user_id')
      .or(
        `and(from_user_id.eq.${user.value.id},to_user_id.eq.${targetUserId}),` +
        `and(from_user_id.eq.${targetUserId},to_user_id.eq.${user.value.id})`
      )
      .maybeSingle();

    if (!data || data.status === 'declined') return { status: 'none' };
    if (data.status === 'accepted') return { status: 'accepted', requestId: data.id };
    if (data.from_user_id === user.value.id) return { status: 'pending_sent', requestId: data.id };
    return { status: 'pending_received', requestId: data.id };
  }

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    fetchAll,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriendshipStatus,
  };
}
