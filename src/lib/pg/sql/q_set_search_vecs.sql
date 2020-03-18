with authors as (
    select
        book_id,
        array_agg(author_name) author_names
    from book_to_author
    join author using(author_id)
    group by book_id
), search_vecs as (
    select
        book_id,
        setweight(to_tsvector('english', title),'A') ||
        setweight(to_tsvector('simple', array_to_string(coalesce(author_names, '{}'::text[]), ', ')),'A') ||
        setweight(to_tsvector('english', array_to_string(coalesce(subjects, '{}'::text[]), ', ')),'D') 
            as vec
    from book_detail
    left join authors using(book_id)
)
update book_detail
    set search = search_vecs.vec
from search_vecs
where book_detail.book_id = search_vecs.book_id;
