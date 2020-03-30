begin;

--store book details
drop table if exists book;
create table book(
    book_id int primary key,
    details jsonb not null,
    search tsvector not null
);

--for search insert
drop function if exists trig_books_set_search_fn();
create or replace function trig_books_set_search_fn()
    returns trigger 
    language 'plpgsql'
as $$
declare
    book_id int;
begin
    select cast(new.details->>'id' as integer) into book_id;
    new.book_id = book_id;
    new.search =
        setweight( to_tsvector('english', new.details->>'title'   ), 'A' ) ||
        setweight( to_tsvector('simple' , new.details->>'authors' ), 'A' ) ||
        setweight( to_tsvector('english', new.details->>'subjects'), 'D' );
    return new;
end;
$$;
drop trigger if exists trig_books_set_search on books;
create trigger trig_books_set_search
    before insert on book for each row 
    execute procedure trig_books_set_search_fn();

-- insert into book(details)
-- values ('{"id":10005,"title":"A Voyage to the Moon\r\nWith Some Account of the Manners and Customs, Science and Philosophy, of the People of Morosofia, and Other Lunarians","authors":["Tucker, George"],"subjects":["Science fiction","Space flight to the moon -- Fiction"]}')
-- on conflict do nothing;

-- select * from book;

--create index idx_book_details on books using GIN(details jsonb_path_ops);
--create index idx_book_search on books using GIN(search);

commit;