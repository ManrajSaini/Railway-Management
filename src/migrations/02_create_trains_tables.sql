-- Create stations table
create table if not exists stations (
  id uuid default uuid_generate_v4() primary key,
  name varchar(255) not null unique,
  city varchar(255) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create trains table
create table if not exists trains (
  id uuid default uuid_generate_v4() primary key,
  name varchar(255) not null,
  source_station_id uuid references stations(id) not null,
  destination_station_id uuid references stations(id) not null,
  departure_time time not null,
  arrival_time time not null,
  total_seats integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint different_stations check (source_station_id != destination_station_id)
);

-- Create train_seats table to track seat availability
create table if not exists train_seats (
  id uuid default uuid_generate_v4() primary key,
  train_id uuid references trains(id) not null,
  travel_date date not null,
  available_seats integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_train_date unique(train_id, travel_date),
  constraint valid_seats check (available_seats >= 0)
);

-- Add triggers for updated_at
create trigger update_stations_updated_at
  before update on stations
  for each row
  execute function update_updated_at_column();

create trigger update_trains_updated_at
  before update on trains
  for each row
  execute function update_updated_at_column();

create trigger update_train_seats_updated_at
  before update on train_seats
  for each row
  execute function update_updated_at_column();

-- Add RLS policies
alter table stations enable row level security;
alter table trains enable row level security;
alter table train_seats enable row level security;

-- Stations policies
create policy "Public read access to stations"
  on stations for select
  to public
  using (true);

create policy "Admin can insert stations"
  on stations for insert
  to authenticated
  using (exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role = 'admin'
  ));

-- Trains policies
create policy "Public read access to trains"
  on trains for select
  to public
  using (true);

create policy "Admin can insert/update trains"
  on trains for all
  to authenticated
  using (exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role = 'admin'
  ));

-- Train seats policies
create policy "Public read access to train_seats"
  on train_seats for select
  to public
  using (true);

create policy "Admin can manage train_seats"
  on train_seats for all
  to authenticated
  using (exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role = 'admin'
  ));
