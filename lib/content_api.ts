import { supabase } from "./supabase";

export interface UserContent {
    id?: string;
    user_id?: string;
    content: string;
    title: string;
    updated_at?: string;
}

export const contentApi = {
    /**
     * Fetch the user's saved practice content.
     * Returns null if no exclusive content found.
     */
    async getUserContent(): Promise<UserContent | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const { data, error } = await supabase
            .from('user_content')
            .select('*')
            .eq('user_id', session.user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error fetching user content:', error);
            return null;
        }

        return data as UserContent;
    },

    /**
     * Save content for the current user.
     * This will upsert (update if exists, insert if not) based on the assumption 
     * of a single active list for now, but we'll implement it as:
     * 1. Try to find existing record.
     * 2. Update it if found, or create new.
     */
    async saveUserContent(content: string): Promise<UserContent | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User must be logged in to save content.");

        // Check for existing record
        const existing = await contentApi.getUserContent();

        const timestamp = new Date().toISOString();

        if (existing && existing.id) {
            // Update
            const { data, error } = await supabase
                .from('user_content')
                .update({ content, updated_at: timestamp })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data as UserContent;
        } else {
            // Insert
            const { data, error } = await supabase
                .from('user_content')
                .insert({
                    user_id: session.user.id,
                    content,
                    title: 'My Practice List'
                })
                .select()
                .single();

            if (error) throw error;
            return data as UserContent;
        }
    }
};
