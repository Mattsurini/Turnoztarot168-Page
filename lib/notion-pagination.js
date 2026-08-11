export async function collectNotionPages(fetchPage) {
  const results = [];
  let cursor = null;
  do {
    const page = await fetchPage(cursor);
    results.push(...(page.results || []));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return results;
}
