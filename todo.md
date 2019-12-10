####### to do
- make a button to destroy something and see what functions run (detach/destroy?)
- use "The Dirty Flush pattern" somewhere
    "You don't remember that chapter? That's because I just invented that name. Gross. ""
- "Side Effect City" - Even the callbacks have side effects...
  - maybe propose some changes to the dev mode output to make things more readable
- Can `dirty` ever contain anything besides a single integer? In other words, are elements updated one after the next, or can `update` sometimes operate on more than one element at a run?
  - no, because `make_dirty` only does its thing if dirty is [-1]:
  - but try with a click handler that updates two props and see what happens to `dirty`
  ```js
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }

```
