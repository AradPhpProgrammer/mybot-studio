/** Move a button to a pre-move insertion slot; never mutate rows or buttons.
 * to.r === rows.length creates a new final row. Empty source rows are removed.
 * Returns the moved button's new selection as well as the grid.
 */
export function moveKeyboardButton(rows, from, to) {
  if (!Array.isArray(rows) || !rows.every(Array.isArray)) return { buttons: rows, position: null };
  const valid = (n) => Number.isInteger(n) && n >= 0;
  if (!from || !to || !valid(from.r) || !valid(from.c) || !valid(to.r) || !valid(to.c)
    || !rows[from.r]?.[from.c] || to.r > rows.length
    || to.c > (rows[to.r]?.length ?? 0)) return { buttons: rows, position: null };
  const grid = rows.map(row => [...row]);
  if (to.r === grid.length) grid.push([]);
  const [button] = grid[from.r].splice(from.c, 1);
  const c = to.c - (from.r === to.r && from.c < to.c ? 1 : 0);
  grid[to.r].splice(c, 0, button);
  const r = grid.slice(0, to.r).filter(row => row.length).length;
  return { buttons: grid.filter(row => row.length), position: { r, c } };
}
