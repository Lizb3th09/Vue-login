import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rifdbtcnyrwhkqardjxd.supabase.co'
const supabaseKey = 'sb_publishable_NL7817t5w9n5TE9WpId5qQ_knZ60SjY'

export const supabase = createClient(supabaseUrl, supabaseKey)