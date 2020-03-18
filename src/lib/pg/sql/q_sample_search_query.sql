select 
    book_id,
    substring(title, 1, 30) as title,
    authors,
    ts_rank(search, ts.query)::numeric(10,3) as r
from 
    (select websearch_to_tsquery('english','Dostoyevsky')||websearch_to_tsquery('simple','Dostoyevsky') as query) as ts, 
book_detail
left join (
    select book_id, array_agg(substring(author_name,1,5)) authors
    from book_to_author join author using(author_id)
    group by book_id
) a using(book_id)
where search @@ ts.query
order by r desc;