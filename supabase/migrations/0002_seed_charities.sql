-- Starter charity directory. Safe to re-run (upserts by slug).
insert into public.charities (slug, name, tagline, description, category, location, website, featured)
values
  ('youth-minds-trust', 'Youth Minds Trust',
   'Free counselling for young people, within a week of asking.',
   'Youth Minds Trust funds trained counsellors in schools and community hubs so that any young person who asks for help is seen within seven days. Every £30 funds one session. Your contribution goes directly to session hours, not overheads.',
   'Mental Health', 'Manchester, UK', 'https://example.org/youth-minds', true),
  ('open-water-project', 'Open Water Project',
   'Clean drinking water for rural communities.',
   'We build and maintain borehole wells with local engineers, then train village committees to keep them running for decades. Each well serves around 800 people.',
   'Environment', 'Kisumu, Kenya', 'https://example.org/open-water', false),
  ('second-serve', 'Second Serve',
   'Hot meals and a warm room for people sleeping rough.',
   'Second Serve runs evening kitchens across three cities, staffed by volunteers and supplied by surplus food partners. Beyond meals, we connect guests with housing caseworkers.',
   'Homelessness', 'Leeds, UK', 'https://example.org/second-serve', false),
  ('the-reading-room', 'The Reading Room',
   'One-to-one reading support for children who are falling behind.',
   'Volunteers spend one hour a week with the same child for a full school year. 82% of children in the programme reach their expected reading level.',
   'Education', 'Bristol, UK', 'https://example.org/reading-room', false),
  ('hearts-in-motion', 'Hearts in Motion',
   'Defibrillators and CPR training in every community.',
   'Hearts in Motion places public-access defibrillators in sports clubs, parks and village halls, and trains local volunteers in CPR. Survival rates triple where a defibrillator is used within minutes.',
   'Health', 'Glasgow, UK', 'https://example.org/hearts-in-motion', false),
  ('wild-margins', 'Wild Margins',
   'Rewilding the forgotten edges of farmland.',
   'Wild Margins works with farmers to turn field edges into wildflower corridors and hedgerows, bringing back pollinators and birds without taking land out of production.',
   'Environment', 'Norfolk, UK', 'https://example.org/wild-margins', false)
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  category = excluded.category, location = excluded.location, website = excluded.website;

-- Upcoming events, including golf days (PRD §08.2).
insert into public.charity_events (charity_id, title, event_date, location, description)
select c.id, e.title, (current_date + e.offset_days)::date, e.location, e.description
from (values
  ('youth-minds-trust', 'Charity Golf Day', 21, 'Mere Golf Resort, Cheshire', 'Teams of four, shotgun start, dinner and auction afterwards.'),
  ('youth-minds-trust', 'Sunrise Walk for Wellbeing', 45, 'Heaton Park, Manchester', 'A 10k walk at dawn. Families welcome.'),
  ('open-water-project', 'Well Opening Livestream', 30, 'Online', 'Watch the community of Nyakach open their new well.'),
  ('second-serve', 'Winter Kitchen Volunteer Night', 10, 'Leeds City Centre', 'Help prepare and serve 200 meals.'),
  ('hearts-in-motion', 'Golf Club CPR Day', 28, 'Gleneagles, Perthshire', 'CPR training for golf club staff and members, followed by a fundraising nine-hole scramble.'),
  ('wild-margins', 'Hedgerow Planting Weekend', 35, 'Holt, Norfolk', 'Plant 1,000 native saplings with us.')
) as e(slug, title, offset_days, location, description)
join public.charities c on c.slug = e.slug
where not exists (
  select 1 from public.charity_events x where x.charity_id = c.id and x.title = e.title
);
