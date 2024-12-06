-- Create bookings table
create table if not exists bookings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) not null,
  train_id uuid references trains(id) not null,
  travel_date date not null,
  num_seats integer not null,
  booking_status varchar(20) not null check (booking_status in ('confirmed', 'cancelled')),
  total_amount decimal(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint valid_num_seats check (num_seats > 0)
);

-- Add trigger for updated_at
create trigger update_bookings_updated_at
  before update on bookings
  for each row
  execute function update_updated_at_column();

-- Add RLS policies
alter table bookings enable row level security;

-- Users can view their own bookings
create policy "Users can view own bookings"
  on bookings for select
  to authenticated
  using (
    auth.uid() = user_id or
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Users can create their own bookings
create policy "Users can create bookings"
  on bookings for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can cancel their own bookings, admin can manage all bookings
create policy "Users can manage own bookings"
  on bookings for update
  to authenticated
  using (
    auth.uid() = user_id or
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Create function to handle booking creation with concurrency control
create or replace function create_booking(
  p_user_id uuid,
  p_train_id uuid,
  p_travel_date date,
  p_num_seats integer,
  p_total_amount decimal
)
returns table (
  success boolean,
  message text,
  booking_id uuid
) language plpgsql
as $$
declare
  v_available_seats integer;
  v_booking_id uuid;
begin
  -- Lock the train_seats row for update
  select available_seats
  into v_available_seats
  from train_seats
  where train_id = p_train_id
    and travel_date = p_travel_date
  for update;

  -- If no seats record exists, create one with default seats from trains table
  if v_available_seats is null then
    insert into train_seats (train_id, travel_date, available_seats)
    select id, p_travel_date, total_seats
    from trains
    where id = p_train_id
    returning available_seats into v_available_seats;
  end if;

  -- Check if enough seats are available
  if v_available_seats >= p_num_seats then
    -- Create booking
    insert into bookings (
      user_id,
      train_id,
      travel_date,
      num_seats,
      booking_status,
      total_amount
    )
    values (
      p_user_id,
      p_train_id,
      p_travel_date,
      p_num_seats,
      'confirmed',
      p_total_amount
    )
    returning id into v_booking_id;

    -- Update available seats
    update train_seats
    set available_seats = available_seats - p_num_seats
    where train_id = p_train_id
      and travel_date = p_travel_date;

    return query select true, 'Booking confirmed', v_booking_id;
  else
    return query select false, 'Not enough seats available', null::uuid;
  end if;
end;
$$;

-- Create function to handle booking cancellation
create or replace function cancel_booking(
  p_booking_id uuid,
  p_user_id uuid
)
returns table (
  success boolean,
  message text
) language plpgsql
as $$
declare
  v_num_seats integer;
  v_train_id uuid;
  v_travel_date date;
  v_booking_status varchar(20);
begin
  -- Get booking details and lock the row
  select num_seats, train_id, travel_date, booking_status
  into v_num_seats, v_train_id, v_travel_date, v_booking_status
  from bookings
  where id = p_booking_id
    and user_id = p_user_id
  for update;

  if not found then
    return query select false, 'Booking not found or unauthorized'::text;
    return;
  end if;

  if v_booking_status = 'cancelled' then
    return query select false, 'Booking is already cancelled'::text;
    return;
  end if;

  -- Update booking status
  update bookings
  set booking_status = 'cancelled'
  where id = p_booking_id;

  -- Return seats to availability
  update train_seats
  set available_seats = available_seats + v_num_seats
  where train_id = v_train_id
    and travel_date = v_travel_date;

  return query select true, 'Booking cancelled successfully'::text;
end;
$$;
