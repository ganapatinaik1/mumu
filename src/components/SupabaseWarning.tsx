import React, { useState } from 'react';
import { Database, ShieldAlert, Sparkles, Copy, Check } from 'lucide-react';

export const SupabaseWarning: React.FC = () => {
  const [copiedText, setCopiedText] = useState<'env' | 'sql' | null>(null);

  const envTemplate = `# Supabase Environment Variables
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`;

  const sqlTemplate = `-- 1. Create Profiles Table (Linked to Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  is_admin boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Username rules (3 to 20 characters, lowercase alphanumeric/underscores)
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 20),
  constraint username_chars check (username ~ '^[a-z0-9_]+$')
);

-- 2. Configure Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Option: Viewable by everyone (Required so users can search profiles & check availability before logging in)
create policy "Allow profile reading for everyone"
  on public.profiles for select
  using (true);

-- Option: Update only own profile
create policy "Allow profile updating for owners only"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Automatic Profile Creation Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, bio, is_admin)
  values (
    new.id,
    -- Extract username from metadata; default to placeholder if not found
    new.raw_user_meta_data->>'username',
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'bio',
    false
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;

  const copyToClipboard = (text: string, type: 'env' | 'sql') => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="min-h-screen bg-radial-gradient py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-4xl w-full glass-card music-glow rounded-3xl p-8 border border-purple-500/20 shadow-2xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-purple-900/40 p-3 rounded-2xl border border-purple-500/30">
            <ShieldAlert className="h-8 w-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-outfit">
              Database Setup Required
            </h1>
            <p className="text-zinc-400 text-sm">
              Please configure your local environment and database schemas to activate Supabase authentication.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {/* Box 1: Env Configuration */}
          <div className="bg-neutral-900/50 rounded-2xl p-6 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  1. Setup .env file
                </h3>
                <button
                  onClick={() => copyToClipboard(envTemplate, 'env')}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  {copiedText === 'env' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                Create a file named <code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded text-xs">.env</code> in the project root directory and add:
              </p>
              <pre className="bg-neutral-950/80 p-3 rounded-lg text-xs font-mono text-purple-300 overflow-x-auto border border-zinc-800/80">
                {envTemplate}
              </pre>
            </div>
            <div className="mt-4 text-zinc-500 text-xs italic">
              Vite will automatically load this config on reload.
            </div>
          </div>

          {/* Box 2: Supabase Schema */}
          <div className="bg-neutral-900/50 rounded-2xl p-6 border border-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-400" />
                2. Run Database SQL
              </h3>
              <button
                onClick={() => copyToClipboard(sqlTemplate, 'sql')}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                {copiedText === 'sql' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-zinc-400 text-sm mb-4">
              Execute this script inside the <strong className="text-purple-400">SQL Editor</strong> on your Supabase dashboard to create the tables, trigger and RLS constraints:
            </p>
            <div className="max-h-[160px] overflow-y-auto bg-neutral-950/80 p-3 rounded-lg text-[10px] font-mono text-zinc-300 border border-zinc-800/80 scrollbar-thin">
              <pre className="whitespace-pre-scroll">{sqlTemplate}</pre>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-zinc-500 text-xs">
          <p>
            Developed with professional music theme UI presets.
          </p>
          <p className="mt-2 sm:mt-0 font-medium text-purple-400 animate-pulse">
            Waiting for environment configuration...
          </p>
        </div>
      </div>
    </div>
  );
};
