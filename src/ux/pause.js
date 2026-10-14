// Pause: the game waits while any reason holds: the pause menu (its pages, and
// the How to play sheet over it) or a phone held sideways. The menu is a small
// state machine, and Escape (or P) steps back one level. Pure: main.js draws
// the state with the HUD and the tutorial.

/** Menu pages. 'help' = the How to play sheet, opened from the menu. */
export const PAGES = ['closed', 'main', 'confirm', 'settings', 'help'];

export function createPause({ onChange = () => {} } = {}) {
  const reasons = new Set();
  let menu = 'closed';
  const emit = () => onChange({ paused: reasons.size > 0, menu });

  /** Open the menu at `page` ('closed' closes it). */
  function show(page = 'main') {
    if (!PAGES.includes(page) || page === menu) return;
    menu = page;
    if (page === 'closed') reasons.delete('menu');
    else reasons.add('menu');
    emit();
  }

  return {
    get paused() {
      return reasons.size > 0;
    },
    get menu() {
      return menu;
    },
    show,
    /** Escape or P: a sub-page goes back to the main page, the main page closes, closed opens. */
    back() {
      show(menu === 'closed' ? 'main' : menu === 'main' ? 'closed' : 'main');
    },
    /** A reason outside the menu, e.g. 'rotate' for a phone held sideways. */
    hold(why, on) {
      if (reasons.has(why) === !!on) return;
      if (on) reasons.add(why);
      else reasons.delete(why);
      emit();
    },
  };
}
