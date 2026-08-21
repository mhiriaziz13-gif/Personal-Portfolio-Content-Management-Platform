update public.profile
set
  github_url = replace(github_url, 'github.com/mhiriaziz13-gif', 'github.com/ahmedazizmhiri'),
  github_label = replace(github_label, 'github.com/mhiriaziz13-gif', 'github.com/ahmedazizmhiri')
where
  github_url like '%github.com/mhiriaziz13-gif%'
  or github_label like '%github.com/mhiriaziz13-gif%';

update public.social_links
set url = replace(url, 'github.com/mhiriaziz13-gif', 'github.com/ahmedazizmhiri')
where url like '%github.com/mhiriaziz13-gif%';

update public.projects
set github_url = replace(github_url, 'github.com/mhiriaziz13-gif', 'github.com/ahmedazizmhiri')
where github_url like '%github.com/mhiriaziz13-gif%';
