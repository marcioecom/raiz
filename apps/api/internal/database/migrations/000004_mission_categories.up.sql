-- A category mission names the categories it counts. An empty list means "any
-- distinct category", so missions created before this column keep working.
alter table missions add column categories text[] not null default '{}';
