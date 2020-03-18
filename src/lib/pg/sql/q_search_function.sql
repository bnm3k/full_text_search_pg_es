drop function search_catalog(varchar);
create function search_catalog(u_query varchar)
    returns table (
        book_details json,
        rank numeric
    )
    language 'sql'
as $$
    select 
        json_build_object(
            'id', book_id,
            'title', title,
            'authors', authors,
            'subjects', subjects
        ) as book_details,
        ts_rank(search, ts.query)::numeric(10,3) as rank
    from 
        (select websearch_to_tsquery('english',u_query)||websearch_to_tsquery('simple',u_query) as query) as ts, 
    book_detail
    left join (
        select book_id, array_agg(author_name) authors
        from book_to_author join author using(author_id)
        group by book_id
    ) a using(book_id)
    where search @@ ts.query
    order by rank desc;
$$;

