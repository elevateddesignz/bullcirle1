alter table profiles
  add column if not exists env_mode text default 'paper' check (env_mode in ('paper','live'));

update profiles set env_mode = coalesce(env_mode, 'paper');
