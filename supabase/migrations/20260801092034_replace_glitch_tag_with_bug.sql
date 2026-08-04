update private.room_players
set tags = array(
  select normalized_tag
  from (
    select
      case when existing_tag = 'glitch' then 'bug' else existing_tag end as normalized_tag,
      min(tag_position) as first_position
    from unnest(tags) with ordinality as existing(existing_tag, tag_position)
    group by case when existing_tag = 'glitch' then 'bug' else existing_tag end
  ) as normalized_tags
  order by first_position
)
where 'glitch' = any(tags);
