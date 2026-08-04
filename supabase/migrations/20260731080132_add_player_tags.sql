alter table private.room_players
  add column tags text[] not null default '{}',
  add constraint room_players_tags_count check (
    cardinality(tags) <= 20
  ),
  add constraint room_players_tags_no_nulls check (
    array_position(tags, null) is null
  ),
  add constraint room_players_tags_total_length check (
    coalesce(char_length(array_to_string(tags, '')), 0) <= 640
  );
