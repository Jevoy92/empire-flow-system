import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get the user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    const userId = user.id;
    console.log(`Deleting account for user: ${userId}`);

    // Create admin client for deletions
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data from all tables (order matters due to foreign keys)
    const tablesToDelete = [
      'future_notes',
      'sessions',
      'projects',
      'project_templates',
      'templates',
      'user_stats',
      'user_settings',
      'user_roles',
      'profiles',
    ];

    for (const table of tablesToDelete) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq(table === 'profiles' || table === 'user_stats' || table === 'user_settings' ? 'id' : 'user_id', userId);
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        // Continue with other tables even if one fails
      } else {
        console.log(`Deleted user data from ${table}`);
      }
    }

    // Delete user's avatar from storage
    const { data: files } = await adminClient.storage
      .from('avatars')
      .list(userId);
    
    if (files && files.length > 0) {
      const filePaths = files.map(f => `${userId}/${f.name}`);
      await adminClient.storage
        .from('avatars')
        .remove(filePaths);
      console.log('Deleted avatar files');
    }

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      throw new Error('Failed to delete account');
    }

    console.log('Account deleted successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
