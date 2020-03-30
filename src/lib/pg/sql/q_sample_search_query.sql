select
    book_id,
    details,
    ts_rank(search, ts.query)::numeric(10,3) as relevance
from
    (select plainto_tsquery('english','arabic mathematics')||plainto_tsquery('simple','arabic mathematics') as query) as ts,
    book 
where book.search @@ ts.query
order by relevance desc
limit 10;