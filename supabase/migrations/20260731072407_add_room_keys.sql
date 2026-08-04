truncate table private.rooms cascade;

alter table private.rooms
  add column room_key text not null,
  add constraint rooms_room_key_format check (
    room_key ~ '^[A-HJ-NP-Z2-9]{6}$'
  ),
  add constraint rooms_room_key_key unique (room_key);

alter table private.room_players
  rename column login_key to player_key;

alter table private.room_players
  rename constraint room_players_login_key_format
  to room_players_player_key_format;

alter table private.room_players
  rename constraint room_players_room_login_key_key
  to room_players_room_player_key_key;
