-- Create users table
create table if not exists users (
  id uuid default uuid_generate_v4() primary key,
  email varchar(255) unique not null,
  password varchar(255) not null,
  name varchar(255) not null,
  role varchar(50) not null check (role in ('admin', 'user')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RLS policies
alter table users enable row level security;

-- Policy for users to read their own data
create policy "Users can view own data" on users
  for select using (auth.uid() = id);

-- Policy for users to update their own data
create policy "Users can update own data" on users
  for update using (auth.uid() = id);

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger update_users_updated_at
  before update on users
  for each row
  execute function update_updated_at_column();
