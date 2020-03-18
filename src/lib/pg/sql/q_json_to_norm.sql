begin;
create table book_detail(
    book_id int primary key,
    title varchar(1000) not null,
    subjects text[],
    search tsvector
);

create table author(
    author_id serial primary key,
    author_name varchar(200) unique not null
);

create table book_to_author(
    book_id int not null references book_detail(book_id),
    author_id int not null references author(author_id),
    unique(book_id, author_id)
);



--insert books
insert into book_detail(book_id, title, subjects)
    select 
        cast(details->>'id' as integer) book_id, 
        regexp_replace(details->>'title', '[;\r\n]+', '; ', 'g') title,
        subjects
    from  books b
    cross join lateral(
        select array_agg(s.subj::text) subjects
        from jsonb_array_elements_text(b.details->'subjects') as s(subj)
    ) s;



--insert authors
insert into author(author_name) 
    with author_list as (
        select 
            jsonb_array_elements(details->'authors')::text author_name
        from books 
    ) 
    select regexp_replace(author_name, '"','','g')
    from author_list
on conflict(author_name) do nothing;



--insert books to authors
insert into book_to_author(book_id, author_id)
    with author_list as (
        select  
            cast(details->>'id' as integer) book_id,
            jsonb_array_elements(details->'authors')::text author_name
        from books
    ) 
    select
        al.book_id,
        a.author_id
    from author_list al
    join author a on regexp_replace(al.author_name, '"','', 'g') = a.author_name
on conflict do nothing;



commit;