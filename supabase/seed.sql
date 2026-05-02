-- Seed data for "Groupe 5" — levels match official roster (R5–R8).

insert into public.players (first_name, last_name, birth_year, level, group_name, parent_email, parent_phone)
values
  ('Ron', 'Cohen', 2014, 'R5', 'Groupe 5', 'parent.ron@example.com', '0798311023'),
  ('Oscar', 'Bragadir', 2015, 'R5', 'Groupe 5', 'parent.oscar@example.com', '0789196600'),
  ('John', 'Ruiz', 2014, 'R5', 'Groupe 5', 'parent.john@example.com', '0799492759'),
  ('Laloe Kingombe', 'Robert', 2014, 'R6', 'Groupe 5', 'parent.robert@example.com', '0788501021'),
  ('Guy', 'William', 2015, 'R6', 'Groupe 5', 'parent.guy@example.com', '0764111527'),
  ('Isaac', 'Silmont', 2014, 'R6', 'Groupe 5', 'parent.isaac@example.com', '0782328333'),
  ('Yacine', 'Tazi', 2014, 'R6', 'Groupe 5', 'parent.yacine@example.com', '0788148222'),
  ('Antoine', 'Achikian', 2013, 'R6', 'Groupe 5', 'parent.antoine@example.com', '0794084395'),
  ('Victor', 'Vispe', 2012, 'R6', 'Groupe 5', 'parent.victor@example.com', '0763601270'),
  ('Paolo', 'Sofia', 2012, 'R6', 'Groupe 5', 'parent.paolo@example.com', '0794581864'),
  ('Arthur', 'Zaugg', 2012, 'R6', 'Groupe 5', 'parent.arthur@example.com', '0793068869'),
  ('Edgard', 'Perret', 2012, 'R7', 'Groupe 5', 'parent.edgard@example.com', '0796470206'),
  ('Dan', 'Khyuppenen', 2012, 'R7', 'Groupe 5', 'parent.dan@example.com', '0788677616'),
  ('Baptiste', 'Devins', 2013, 'R7', 'Groupe 5', 'parent.baptiste@example.com', '0795551212'),
  ('Louis', 'Boulard', 2014, 'R7', 'Groupe 5', 'parent.louis@example.com', '0793323238'),
  ('Julian', 'Altherr', 2015, 'R7', 'Groupe 5', 'parent.julian@example.com', '0792515320'),
  ('James', 'Caze', 2013, 'R7', 'Groupe 5', 'parent.james@example.com', '0763919705'),
  ('Deyi', 'Jin', 2015, 'R7', 'Groupe 5', 'parent.deyi@example.com', '0794850709'),
  ('Janali', 'Steudler', 2012, 'R8', 'Groupe 5', 'parent.janali@example.com', '0786377024')
on conflict do nothing;
