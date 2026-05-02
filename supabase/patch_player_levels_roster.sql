-- One-off: align player.level (R5–R8) + Dan’s surname with official roster.
-- Run in Supabase SQL Editor against your project (safe to re-run).

update public.players
set level = 'R5'
where group_name = 'Groupe 5' and first_name = 'Ron' and last_name = 'Cohen' and birth_year = 2014;

update public.players
set level = 'R5'
where group_name = 'Groupe 5' and first_name = 'Oscar' and last_name = 'Bragadir' and birth_year = 2015;

update public.players
set level = 'R5'
where group_name = 'Groupe 5' and first_name = 'John' and last_name = 'Ruiz' and birth_year = 2014;

update public.players
set level = 'R6'
where group_name = 'Groupe 5' and first_name = 'Laloe Kingombe' and last_name = 'Robert' and birth_year = 2014;

update public.players
set level = 'R6'
where group_name = 'Groupe 5' and first_name = 'Guy' and last_name = 'William' and birth_year = 2015;

update public.players
set level = 'R6'
where group_name = 'Groupe 5' and first_name = 'Isaac' and last_name = 'Silmont' and birth_year = 2014;

update public.players
set level = 'R6'
where group_name = 'Groupe 5' and first_name = 'Yacine' and last_name = 'Tazi' and birth_year = 2014;

update public.players
set level = 'R6'
where group_name = 'Groupe 5' and first_name = 'Antoine' and last_name = 'Achikian' and birth_year = 2013;

update public.players
set level = 'R6'
where group_name = 'Groupe 5' and first_name = 'Victor' and last_name = 'Vispe' and birth_year = 2012;

update public.players
set level = 'R6'
where group_name = 'Groupe 5' and first_name = 'Paolo' and last_name = 'Sofia' and birth_year = 2012;

update public.players
set level = 'R6'
where group_name = 'Groupe 5' and first_name = 'Arthur' and last_name = 'Zaugg' and birth_year = 2012;

update public.players
set level = 'R7'
where group_name = 'Groupe 5' and first_name = 'Edgard' and last_name = 'Perret' and birth_year = 2012;

-- Fix typo Khyuppenpen → Khyuppenen and set R7
update public.players
set level = 'R7', last_name = 'Khyuppenen'
where group_name = 'Groupe 5' and first_name = 'Dan' and birth_year = 2012
  and last_name in ('Khyuppenpen', 'Khyuppenen');

update public.players
set level = 'R7'
where group_name = 'Groupe 5' and first_name = 'Baptiste' and last_name = 'Devins' and birth_year = 2013;

update public.players
set level = 'R7'
where group_name = 'Groupe 5' and first_name = 'Louis' and last_name = 'Boulard' and birth_year = 2014;

update public.players
set level = 'R7'
where group_name = 'Groupe 5' and first_name = 'Julian' and last_name = 'Altherr' and birth_year = 2015;

update public.players
set level = 'R7'
where group_name = 'Groupe 5' and first_name = 'James' and last_name = 'Caze' and birth_year = 2013;

update public.players
set level = 'R7'
where group_name = 'Groupe 5' and first_name = 'Deyi' and last_name = 'Jin' and birth_year = 2015;

update public.players
set level = 'R8'
where group_name = 'Groupe 5' and first_name = 'Janali' and last_name = 'Steudler' and birth_year = 2012;
