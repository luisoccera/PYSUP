begin;

insert into public.genres(name, slug) values
  ('Ciencia ficción', 'ciencia-ficcion'),
  ('Drama', 'drama'),
  ('Comedia', 'comedia'),
  ('Terror', 'terror'),
  ('Anime', 'anime'),
  ('Documental', 'documental'),
  ('Misterio', 'misterio'),
  ('Romance', 'romance'),
  ('Fantasía', 'fantasia')
on conflict (slug) do update set name = excluded.name;

insert into public.content_providers(provider_key,name,brand_color,official_base_url,catalog_adapter) values
  ('netflix','Netflix','#E50914','https://www.netflix.com','pending-commercial-api'),
  ('max','Max','#6A3DFF','https://www.max.com','pending-commercial-api'),
  ('disney','Disney+','#0B65D8','https://www.disneyplus.com','pending-commercial-api'),
  ('crunchyroll','Crunchyroll','#F47521','https://www.crunchyroll.com','pending-commercial-api'),
  ('prime','Prime Video','#1399FF','https://www.primevideo.com','pending-commercial-api'),
  ('apple','Apple TV','#F5F5F7','https://tv.apple.com','pending-commercial-api')
on conflict (provider_key) do update set name = excluded.name, brand_color = excluded.brand_color, official_base_url = excluded.official_base_url;

insert into public.content_items(id,external_id,title,content_type,release_year,duration_minutes,maturity_rating,synopsis,score,popularity,discovery_score,mood_tags,source_name,source_updated_at) values
  ('10000000-0000-4000-8000-000000000001','signal-noir','Señal nocturna','movie',2025,118,'16+','Una operadora de radio descubre que puede hablar con una desconocida atrapada veinticinco años en el pasado. Cada respuesta altera su propia noche.',4.7,0.34,0.91,array['intense','thoughtful'],'pysup-demo',timezone('utc', now())),
  ('10000000-0000-4000-8000-000000000002','after-the-rain','Después de la lluvia','series',2026,48,'13+','Dos antiguos amigos regresan al pueblo costero que juraron abandonar y encuentran un archivo de cartas que cambia lo que recuerdan.',4.5,0.28,0.88,array['calm','thoughtful'],'pysup-demo',timezone('utc', now())),
  ('10000000-0000-4000-8000-000000000003','orbit-9','Órbita nueve','series',2025,52,'16+','Al despertar de una misión fallida, nueve astronautas reciben mensajes firmados por versiones futuras de ellos mismos.',4.8,0.42,0.86,array['intense','thoughtful'],'pysup-demo',timezone('utc', now())),
  ('10000000-0000-4000-8000-000000000004','paper-gods','Dioses de papel','anime',2026,24,'13+','Una aprendiz de restauración libera a una deidad olvidada al reparar un libro que debía permanecer incompleto.',4.6,0.21,0.95,array['uplifting','intense'],'pysup-demo',timezone('utc', now())),
  ('10000000-0000-4000-8000-000000000005','the-last-lantern','La última linterna','movie',2024,126,'16+','Una archivista sigue un mapa de luces encendidas durante el gran apagón y descubre la historia secreta de su familia.',4.4,0.18,0.93,array['calm','thoughtful'],'pysup-demo',timezone('utc', now()))
on conflict (id) do update set title = excluded.title, synopsis = excluded.synopsis, source_updated_at = excluded.source_updated_at;

insert into public.content_genres(content_id,genre_id)
select mapping.content_id, g.id
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid,'Misterio'),
  ('10000000-0000-4000-8000-000000000001'::uuid,'Ciencia ficción'),
  ('10000000-0000-4000-8000-000000000002'::uuid,'Drama'),
  ('10000000-0000-4000-8000-000000000002'::uuid,'Romance'),
  ('10000000-0000-4000-8000-000000000003'::uuid,'Ciencia ficción'),
  ('10000000-0000-4000-8000-000000000003'::uuid,'Drama'),
  ('10000000-0000-4000-8000-000000000004'::uuid,'Anime'),
  ('10000000-0000-4000-8000-000000000004'::uuid,'Fantasía'),
  ('10000000-0000-4000-8000-000000000005'::uuid,'Misterio'),
  ('10000000-0000-4000-8000-000000000005'::uuid,'Drama')
) as mapping(content_id,genre_name)
join public.genres g on g.name = mapping.genre_name
on conflict do nothing;

insert into public.content_availability(content_id,provider_id,country_code,status,access_type,official_url,checked_at,expires_at)
select mapping.content_id, cp.id, mapping.country_code, 'available', 'subscription', cp.official_base_url, timezone('utc', now()), timezone('utc', now()) + interval '30 days'
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid,'netflix','MX'),('10000000-0000-4000-8000-000000000001'::uuid,'netflix','ES'),('10000000-0000-4000-8000-000000000001'::uuid,'netflix','AR'),('10000000-0000-4000-8000-000000000001'::uuid,'netflix','CO'),
  ('10000000-0000-4000-8000-000000000002'::uuid,'max','MX'),('10000000-0000-4000-8000-000000000002'::uuid,'max','ES'),('10000000-0000-4000-8000-000000000002'::uuid,'max','CO'),('10000000-0000-4000-8000-000000000002'::uuid,'max','CL'),
  ('10000000-0000-4000-8000-000000000003'::uuid,'prime','MX'),('10000000-0000-4000-8000-000000000003'::uuid,'prime','AR'),('10000000-0000-4000-8000-000000000003'::uuid,'prime','CO'),('10000000-0000-4000-8000-000000000003'::uuid,'prime','US'),
  ('10000000-0000-4000-8000-000000000004'::uuid,'crunchyroll','MX'),('10000000-0000-4000-8000-000000000004'::uuid,'crunchyroll','ES'),('10000000-0000-4000-8000-000000000004'::uuid,'crunchyroll','AR'),('10000000-0000-4000-8000-000000000004'::uuid,'crunchyroll','CO'),('10000000-0000-4000-8000-000000000004'::uuid,'crunchyroll','CL'),('10000000-0000-4000-8000-000000000004'::uuid,'crunchyroll','US'),
  ('10000000-0000-4000-8000-000000000005'::uuid,'disney','MX'),('10000000-0000-4000-8000-000000000005'::uuid,'disney','ES'),('10000000-0000-4000-8000-000000000005'::uuid,'disney','AR'),('10000000-0000-4000-8000-000000000005'::uuid,'disney','CL')
) as mapping(content_id,provider_key,country_code)
join public.content_providers cp on cp.provider_key = mapping.provider_key
on conflict (content_id,provider_id,country_code,access_type) do update set status = excluded.status, official_url = excluded.official_url, checked_at = excluded.checked_at, expires_at = excluded.expires_at;

commit;
