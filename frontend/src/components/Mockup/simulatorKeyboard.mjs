/** Track only delivered reply keyboards. Mirrors the worker's unified rule:
 *  any inline delivery clears an active reply keyboard; a new reply replaces it. */
export function reduceDeliveredReplyKeyboard(current, messages) {
  return messages.reduce((visible, message) => {
    const markup = message.reply_markup;
    const source = message.keyboard_node_id || message.node_id || null;
    if (markup?.remove_keyboard === true) return { source: null, buttons: [] };
    if (Array.isArray(markup?.keyboard) && markup.keyboard.some(row => row.length)) return { source, buttons: markup.keyboard };
    if (markup?.inline_keyboard?.some(row => row?.length) && visible.source) return { source: null, buttons: [] };
    return visible;
  }, current || { source: null, buttons: [] });
}
