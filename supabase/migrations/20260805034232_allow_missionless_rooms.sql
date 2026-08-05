alter table private.rooms
  alter column mission_key drop not null,
  alter column state_version drop not null,
  alter column state drop not null;

alter table private.rooms
  add constraint rooms_mission_state_presence check (
    (
      mission_key is null
      and state_version is null
      and state is null
    )
    or
    (
      mission_key is not null
      and state_version is not null
      and state is not null
    )
  );
