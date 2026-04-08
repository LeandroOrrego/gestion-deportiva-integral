-- Crea la tabla transactions si no existe
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  amount numeric not null,
  concept text not null,
  date date not null,
  type text not null check (type in ('INGRESO', 'EGRESO'))
);

-- Habilita Row Level Security
alter table transactions enable row level security;

-- Política para permitir lectura a todos (o autenticados)
create policy "Permitir lectura publica"
on transactions for select
to public
using (true);

-- Política para permitir inserción a todos (o autenticados)
create policy "Permitir insercion publica"
on transactions for insert
to public
with check (true);
