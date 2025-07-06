
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const getOrCreateProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setLoading(false);
          return;
        }

        // Try to get existing profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const username = session.user.email?.split('@')[0] || `user_${Date.now()}`;
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              username: username,
              display_name: session.user.user_metadata?.full_name || username
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            toast({
              title: "Profile Error",
              description: "Failed to create user profile. Please try again.",
              variant: "destructive",
            });
          } else {
            setProfile(newProfile);
          }
        } else if (fetchError) {
          console.error('Error fetching profile:', fetchError);
          toast({
            title: "Profile Error",
            description: "Failed to load user profile.",
            variant: "destructive",
          });
        } else {
          setProfile(existingProfile);
        }
      } catch (error) {
        console.error('Profile hook error:', error);
      } finally {
        setLoading(false);
      }
    };

    getOrCreateProfile();
  }, [toast]);

  return { profile, loading };
};
