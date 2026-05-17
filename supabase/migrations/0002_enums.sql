create type risk_profile as enum ('conservative', 'moderate', 'aggressive');
create type asset_class as enum (
  'fiis', 'stocks_br', 'stocks_intl', 'fixed_income',
  'funds', 'liquidity', 'etf_br', 'etf_intl'
);
create type indexer as enum ('cdi', 'ipca', 'igpm', 'selic', 'prefixado', 'usd', 'none');
create type institution as enum ('xp', 'btg', 'nomad');
create type import_status as enum ('pending', 'processing', 'completed', 'failed');
create type alert_severity as enum ('info', 'warning', 'critical');
create type alert_status as enum ('unread', 'read', 'dismissed');
create type currency as enum ('BRL', 'USD');
