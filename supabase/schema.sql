-- Create user_content table
create table user_content (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text default 'My Practice List',
  content text not null, -- The sentences separated by newlines
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table user_content enable row level security;

-- Policy for users to select their own content
create policy "Users can view their own content"
on user_content for select
using (auth.uid() = user_id);

-- Policy for users to insert their own content
create policy "Users can insert their own content"
on user_content for insert
with check (auth.uid() = user_id);

-- Policy for users to update their own content
create policy "Users can update their own content"
on user_content for update
using (auth.uid() = user_id);

-- Trigger to update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_user_content_updated_at
before update on user_content
for each row
execute procedure update_updated_at_column();
