-- Demo dataset. The UI labels it as demo: these are not real visitors.
-- Applied by cmd/seed after the migrations. Product copy stays in pt-BR.

insert into stores (id, cnpj, name, category, floor, is_partner) values
  ('11111111-1111-1111-1111-111111111101', '11222333000181', 'Casa do Pão',      'alimentacao',   'L1', true),
  ('11111111-1111-1111-1111-111111111102', '22333444000181', 'Café do Cerrado',  'alimentacao',   'L1', true),
  ('11111111-1111-1111-1111-111111111103', '33444555000181', 'Studio Aurora',    'moda',          'L2', true),
  ('11111111-1111-1111-1111-111111111104', '44555666000181', 'Farmácia Bem Viver', 'saude',       'L1', true),
  ('11111111-1111-1111-1111-111111111105', '55666777000181', 'Cinema Lumière',   'entretenimento', 'L3', true)
on conflict (id) do nothing;

-- Real Capim Dourado stores: the demo scans their receipts.
insert into stores (id, cnpj, name, category, floor, is_partner) values
  ('11111111-1111-1111-1111-111111111106', '06347409018889',
   'Centauro', 'esportes', 'L2', true),
  ('11111111-1111-1111-1111-111111111107', '22582843000186',
   'Leitura Palmas Livraria e Papelaria', 'livraria', 'L1', true),
  ('11111111-1111-1111-1111-111111111108', '30112222000167',
   'Supermercado Peg Pag Continental', 'alimentacao', 'L1', true)
on conflict (id) do nothing;

insert into seasons (id, name, starts_at, ends_at, status) values
  ('22222222-2222-2222-2222-222222222201', 'Safra 1 — Volta ao Capim', '2026-11-12', '2027-01-09', 'active')
on conflict (id) do nothing;

insert into missions (id, season_id, code, title, rule_type, target, reward_points, categories) values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201',
   'tres_lojas', 'Compre em 3 lojas diferentes em 7 dias', 'stores', 3, 150, '{}'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201',
   'alimentacao_e_moda', 'Alimentação + moda na mesma semana', 'category', 2, 100,
   '{alimentacao,moda}'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201',
   'ritmo_4_semanas', 'Ritmo: 4 semanas seguidas no Capim', 'rhythm', 4, 200, '{}')
on conflict (id) do update set categories = excluded.categories;

insert into offers (id, store_id, title, description, valid_until, active) values
  ('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111102',
   'Café 50% até 18h', 'No Café do Cerrado, apresentando o cupom do dia.', '2026-12-31T21:00:00Z', true),
  ('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111103',
   'Segunda peça com 30% off', 'Coleção de verão, no Studio Aurora.', '2026-12-15T21:00:00Z', true),
  ('55555555-5555-5555-5555-555555555503', '11111111-1111-1111-1111-111111111105',
   'Sessão da tarde por R$ 19', 'De segunda a quinta, no Cinema Lumière.', '2026-12-20T21:00:00Z', true)
on conflict (id) do nothing;

insert into events (id, title, description, place, starts_at, ends_at, active) values
  ('66666666-6666-6666-6666-666666666601', 'Banda da Terra',
   'Show de encerramento do HackaRun.', 'Praça central', '2026-11-14T20:30:00Z', '2026-11-14T21:30:00Z', true),
  ('66666666-6666-6666-6666-666666666602', 'Feira do Cerrado',
   'Artesanato e comida típica do Tocantins.', 'Piso L1', '2026-11-21T14:00:00Z', '2026-11-23T22:00:00Z', true)
on conflict (id) do nothing;

insert into rewards (id, store_id, title, cost, stock, terms) values
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101',
   'Café na Casa do Pão', 300, 50, 'Válido de segunda a sexta, das 8h às 11h.'),
  ('44444444-4444-4444-4444-444444444402', null,
   '2h de estacionamento', 400, null, 'Válido no mesmo dia do resgate.'),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111105',
   'Ingresso de cinema', 1200, 20, 'Sessões de segunda a quinta, exceto feriados.'),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111102',
   'Sobremesa no Café do Cerrado', 250, 40, 'Uma por resgate, consumo mínimo de R$ 20.')
on conflict (id) do nothing;
