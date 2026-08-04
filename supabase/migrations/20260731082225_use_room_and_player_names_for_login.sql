truncate table private.rooms cascade;

alter table private.rooms
  drop constraint rooms_name_format,
  drop column room_key,
  add constraint rooms_name_format check (
    name = btrim(name)
    and name ~ '^[A-Za-z0-9_-]{2,32}$'
  );

alter table private.room_players
  drop constraint room_players_display_name_format,
  drop column player_key,
  add column color text not null default 'indigo',
  add constraint room_players_display_name_format check (
    display_name = btrim(display_name)
    and display_name ~ '^[A-Za-z0-9_-]{1,32}$'
  ),
  add constraint room_players_color check (
    color in ('indigo', 'pink', 'blue', 'green', 'yellow', 'orange')
  );
