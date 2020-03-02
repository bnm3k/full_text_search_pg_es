begin;
--store book details
create table books(
    details jsonb not null,
    search tsvector not null
);

create index idx_books_details on books using GIN(details jsonb_path_ops);
create index idx_books_search on books using GIN(search);


--for search
create or replace function trig_books_set_search_fn()
    returns trigger 
    language 'plpgsql'
as $$
begin
    new.search = to_tsvector('english', concat(
        new.details->>'title', 
        new.details->>'authors', 
        new.details->>'subjects'));
    return new;
end;
$$;
drop trigger if exists trig_books_set_search on books;
create trigger trig_books_set_search
    before insert on books for each row 
    execute procedure trig_books_set_search_fn();


--for retrieving by id
create or replace function find_book_by_id(id int)
    returns jsonb
    language 'sql'
as $$
    select details from books
    where details->>'id' = id::text limit 1;
$$;
--select find_book_by_id(12);

drop function search_books(varchar)
create or replace function search_books(query varchar)
    returns table(details jsonb, rank real)
    language 'sql'
as $$
    select details, ts_rank_cd(search, to_tsquery(query)) as rank
        from books 
        order by rank desc;
$$;

commit;