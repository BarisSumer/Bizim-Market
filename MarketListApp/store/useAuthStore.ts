import { Family, Profile, supabase } from '@/lib/supabase';
import { RealtimeChannel, Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { create } from 'zustand';

// Family request type
export interface FamilyRequest {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    created_at: string;
}

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    family: Family | null;
    familyMembers: Profile[];
    pendingRequests: FamilyRequest[];
    isLoading: boolean;
    isInitialized: boolean;

    // Subscriptions
    requestsSubscription: RealtimeChannel | null;
    profileSubscription: RealtimeChannel | null;

    // Actions
    initialize: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    fetchProfile: () => Promise<void>;
    fetchFamily: () => Promise<void>;
    fetchFamilyMembers: () => Promise<void>;
    fetchPendingRequests: () => Promise<void>;
    joinFamily: (code: string) => Promise<{ success: boolean; pending?: boolean; error?: string }>;
    handleFamilyRequest: (requestId: string, decision: 'approve' | 'reject') => Promise<{ success: boolean; error?: string }>;
    sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
    updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
    subscribeToFamilyRequests: () => void;
    subscribeToProfileChanges: () => void;
    unsubscribeAll: () => void;
    // Push notification actions
    registerPushToken: () => Promise<{ success: boolean; error?: string }>;
    removePushToken: () => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    profile: null,
    family: null,
    familyMembers: [],
    pendingRequests: [],
    isLoading: false,
    isInitialized: false,
    requestsSubscription: null,
    profileSubscription: null,

    initialize: async () => {
        try {
            set({ isLoading: true });

            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                set({ session, user: session.user });
                await get().fetchProfile();
                await get().fetchFamily();
                await get().fetchFamilyMembers();
                await get().fetchPendingRequests();
                get().subscribeToFamilyRequests();
                get().subscribeToProfileChanges();
            }

            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('[Auth] State change:', event);
                set({ session, user: session?.user || null });

                if (session) {
                    await get().fetchProfile();
                    await get().fetchFamily();
                    await get().fetchFamilyMembers();
                    await get().fetchPendingRequests();
                    get().subscribeToFamilyRequests();
                    get().subscribeToProfileChanges();
                } else {
                    get().unsubscribeAll();
                    set({ profile: null, family: null, familyMembers: [], pendingRequests: [] });
                }
            });

        } catch (error) {
            console.error('Auth initialization error:', error);
        } finally {
            set({ isLoading: false, isInitialized: true });
        }
    },

    signIn: async (email, password) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { error };

            await get().fetchProfile();
            await get().fetchFamily();
            await get().fetchFamilyMembers();
            await get().fetchPendingRequests();
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        } finally {
            set({ isLoading: false });
        }
    },

    signUp: async (email, password, fullName) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } },
            });
            if (error) return { error };
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        } finally {
            set({ isLoading: false });
        }
    },

    signOut: async () => {
        set({ isLoading: true });
        try {
            // Remove push token before signing out
            await get().removePushToken();
            get().unsubscribeAll();
            await supabase.auth.signOut();
            set({
                session: null,
                user: null,
                profile: null,
                family: null,
                familyMembers: [],
                pendingRequests: []
            });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Fetch profile error:', error);
                return;
            }
            set({ profile: data });
        } catch (error) {
            console.error('Fetch profile error:', error);
        }
    },

    fetchFamily: async () => {
        const { profile } = get();
        if (!profile?.family_id) return;

        try {
            const { data, error } = await supabase
                .from('families')
                .select('*')
                .eq('id', profile.family_id)
                .single();

            if (error) {
                console.error('Fetch family error:', error);
                return;
            }
            set({ family: data });
        } catch (error) {
            console.error('Fetch family error:', error);
        }
    },

    fetchFamilyMembers: async () => {
        const { profile } = get();
        if (!profile?.family_id) {
            set({ familyMembers: [] });
            return;
        }

        try {
            // Use RPC function to avoid RLS recursion
            const { data, error } = await supabase.rpc('get_my_family_members');

            if (error) {
                console.error('Fetch family members error:', error);
                set({ familyMembers: [] });
                return;
            }

            set({ familyMembers: data || [] });
        } catch (error) {
            console.error('Fetch family members error:', error);
            set({ familyMembers: [] });
        }
    },

    fetchPendingRequests: async () => {
        try {
            const { data, error } = await supabase.rpc('get_family_requests');
            if (error) {
                set({ pendingRequests: [] });
                return;
            }

            const result = data as { success: boolean; requests?: FamilyRequest[] };
            set({ pendingRequests: result.success && result.requests ? result.requests : [] });
        } catch (error) {
            set({ pendingRequests: [] });
        }
    },

    subscribeToFamilyRequests: () => {
        const { profile, requestsSubscription } = get();
        if (!profile?.family_id) return;

        if (requestsSubscription) {
            supabase.removeChannel(requestsSubscription);
        }

        const subscription = supabase
            .channel(`family_requests_${profile.family_id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'family_requests',
                filter: `family_id=eq.${profile.family_id}`,
            }, () => {
                get().fetchPendingRequests();
                get().fetchFamilyMembers();
            })
            .subscribe();

        set({ requestsSubscription: subscription });
    },

    subscribeToProfileChanges: () => {
        const { user, profileSubscription } = get();
        if (!user?.id) return;

        if (profileSubscription) {
            supabase.removeChannel(profileSubscription);
        }

        const subscription = supabase
            .channel(`profile_${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`,
            }, async (payload) => {
                const newProfile = payload.new as Profile;
                const oldProfile = get().profile;

                if (newProfile.family_id && newProfile.family_id !== oldProfile?.family_id) {
                    set({ profile: newProfile });
                    await get().fetchFamily();
                    await get().fetchFamilyMembers();
                    get().subscribeToFamilyRequests();

                    Alert.alert('🎉 Hoş Geldiniz!', 'Aileye kabul edildiniz!');

                    try {
                        const { useGroceryStore } = require('./useGroceryStore');
                        useGroceryStore.getState().fetchItems();
                        useGroceryStore.getState().subscribeToChanges();
                    } catch (e) {
                        console.error('Failed to refresh grocery items:', e);
                    }
                } else {
                    set({ profile: newProfile });
                }
            })
            .subscribe();

        set({ profileSubscription: subscription });
    },

    unsubscribeAll: () => {
        const { requestsSubscription, profileSubscription } = get();
        if (requestsSubscription) supabase.removeChannel(requestsSubscription);
        if (profileSubscription) supabase.removeChannel(profileSubscription);
        set({ requestsSubscription: null, profileSubscription: null });
    },

    joinFamily: async (code) => {
        set({ isLoading: true });
        try {
            const { data, error } = await supabase.rpc('join_family_by_code', {
                code: code.toUpperCase().trim(),
            });

            if (error) return { success: false, error: error.message };

            const result = data as { success: boolean; pending?: boolean; error?: string };
            if (!result.success) return { success: false, error: result.error };

            if (result.pending) return { success: true, pending: true };

            await get().fetchProfile();
            await get().fetchFamily();
            await get().fetchFamilyMembers();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error?.message };
        } finally {
            set({ isLoading: false });
        }
    },

    handleFamilyRequest: async (requestId, decision) => {
        set({ isLoading: true });
        try {
            const { data, error } = await supabase.rpc('handle_family_request', {
                request_id: requestId,
                decision,
            });

            if (error) return { success: false, error: error.message };

            const result = data as { success: boolean; error?: string };
            if (!result.success) return { success: false, error: result.error };

            await get().fetchPendingRequests();
            await get().fetchFamilyMembers();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error?.message };
        } finally {
            set({ isLoading: false });
        }
    },

    sendPasswordResetEmail: async (email) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'bizimmarket://reset-password',
            });

            if (error) {
                console.error('Password reset email error:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            console.error('Password reset email error:', error);
            return { success: false, error: error?.message || 'Bir hata oluştu' };
        } finally {
            set({ isLoading: false });
        }
    },

    updatePassword: async (newPassword) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                console.error('Update password error:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            console.error('Update password error:', error);
            return { success: false, error: error?.message || 'Bir hata oluştu' };
        } finally {
            set({ isLoading: false });
        }
    },

    // Push notification token management
    registerPushToken: async () => {
        const { user, profile } = get();
        if (!user) return { success: false, error: 'Kullanıcı oturumu bulunamadı' };

        try {
            // Import notification utilities
            const { requestNotificationPermissions, getExpoPushToken, isPushNotificationsSupported } = require('@/lib/notifications');

            // Check if push notifications are supported
            if (!isPushNotificationsSupported()) {
                return { success: false, error: 'Push bildirimleri yalnızca fiziksel cihazlarda çalışır' };
            }

            // Request permissions
            const hasPermission = await requestNotificationPermissions();
            if (!hasPermission) {
                return { success: false, error: 'Bildirim izni verilmedi' };
            }

            // Get push token
            const token = await getExpoPushToken();
            if (!token) {
                return { success: false, error: 'Push token alınamadı' };
            }

            // Save token to Supabase
            const { error } = await supabase
                .from('profiles')
                .update({ expo_push_token: token })
                .eq('id', user.id);

            if (error) {
                console.error('Error saving push token:', error);
                return { success: false, error: error.message };
            }

            // Update local profile state
            if (profile) {
                set({ profile: { ...profile, expo_push_token: token } });
            }

            console.log('[Auth] Push token registered successfully');
            return { success: true };
        } catch (error: any) {
            console.error('Error registering push token:', error);
            return { success: false, error: error?.message || 'Bir hata oluştu' };
        }
    },

    removePushToken: async () => {
        const { user, profile } = get();
        if (!user) return { success: false, error: 'Kullanıcı oturumu bulunamadı' };

        // Skip if there's no token to remove
        if (!profile?.expo_push_token) {
            return { success: true };
        }

        try {
            // Remove token from Supabase
            const { error } = await supabase
                .from('profiles')
                .update({ expo_push_token: null })
                .eq('id', user.id);

            if (error) {
                console.error('Error removing push token:', error);
                return { success: false, error: error.message };
            }

            // Update local profile state
            if (profile) {
                set({ profile: { ...profile, expo_push_token: null } });
            }

            console.log('[Auth] Push token removed successfully');
            return { success: true };
        } catch (error: any) {
            console.error('Error removing push token:', error);
            return { success: false, error: error?.message || 'Bir hata oluştu' };
        }
    },
}));
