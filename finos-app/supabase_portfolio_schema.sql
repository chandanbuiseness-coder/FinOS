
-- ── Portfolio Holdings ─────────────────────────────────────────────────────
create table if not exists user_portfolio (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  symbol      text not null,
  name        text not null,
  quantity    decimal(18, 6) not null check (quantity > 0),
  avg_price   decimal(18, 2) not null check (avg_price > 0),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, symbol)  
);

alter table user_portfolio enable row level security;

create policy "Users can read own portfolio"
  on user_portfolio for select using (auth.uid() = user_id);

create policy "Users can insert to own portfolio"
  on user_portfolio for insert with check (auth.uid() = user_id);

create policy "Users can update own portfolio"
  on user_portfolio for update using (auth.uid() = user_id);

create policy "Users can delete from own portfolio"
  on user_portfolio for delete using (auth.uid() = user_id);

create index if not exists idx_user_portfolio_user_id on user_portfolio(user_id);


-- ── Watchlist ──────────────────────────────────────────────────────────────
create table if not exists user_watchlist (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  symbol     text not null,
  added_at   timestamptz default now(),
  unique (user_id, symbol)
);

alter table user_watchlist enable row level security;

create policy "Users can read own watchlist"
  on user_watchlist for select using (auth.uid() = user_id);

create policy "Users can insert to own watchlist"
  on user_watchlist for insert with check (auth.uid() = user_id);

create policy "Users can delete from own watchlist"
  on user_watchlist for delete using (auth.uid() = user_id);

create index if not exists idx_user_watchlist_user_id on user_watchlist(user_id);


-- ── User Settings ──────────────────────────────────────────────────────────
create table if not exists user_settings (
  user_id           uuid references auth.users on delete cascade primary key,
  risk_tolerance    text default 'Moderate' check (risk_tolerance in ('Low', 'Moderate', 'High')),
  default_lot_size  int  default 1,
  notifications_email boolean default true,
  notifications_alerts boolean default true,
  theme             text default 'dark',
  default_currency  text default 'INR',
  updated_at        timestamptz default now()
);

alter table user_settings enable row level security;

create policy "Users can read own settings"
  on user_settings for select using (auth.uid() = user_id);

create policy "Users can upsert own settings"
  on user_settings for insert with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on user_settings for update using (auth.uid() = user_id);


-- ── Auto-update updated_at trigger ────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_user_portfolio_updated_at
  before update on user_portfolio
  for each row execute function update_updated_at_column();

create trigger trg_user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at_column();
