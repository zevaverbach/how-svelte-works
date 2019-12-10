---
title: How Does Svelte Actually Work? part 2
published: false
description: A conversational, thinking-out-loud tour of the JavaScript that Svelte outputs... part deux
tags: svelte javascript
---
[Here's part 1](https://dev.to/zev/how-does-svelte-actually-work-part-1-j9m), and here's the repository for what we've done so far:

{% github zevaverbach/how-svelte-works no-readme %} 

(hint: we have barely changed Svelte's sample app).
    
# Episode Recap

On the previous episode of HDSAW we took a bewildering ride through the 400 or so lines of vanilla JavaScript the Svelte compiler produces from [the sample app](https://github.com/sveltejs/template). Here's [that vanilla JS](https://gist.github.com/zevaverbach/83901aed1230fbd3adb01b96a7be0572) for your perusal, and see below for an updated version.

## What We've Learned So Far

When we run `npm run dev` to compile the sample app, Rollup takes the contents of `main.js` and runs the Svelte compiler on it. This produces a file called `bundle.js` in the `build` directory.

`bundle.js` defines and immediately calls an anonymous function, creating an instance of `App` called `app`. The code which runs inside the constructor of `App` first renders the Svelte app, then binds a small handful of methods to the instance. These methods can be used to get and set the state of the app, including by the user in the browser's JavaScript console! 

## Outstanding Questions

1) Is it a security problem that the user can directly manipulate the app's state from a browser's JavaScript console?
2) What is the difference between `app.$set` and `app.$inject_state`, if any?
3) How does `bundle.js` change with increasing app complexity? Multiple components, for example, or dynamically re-rendering props/state.
4) What is `__svelte_meta` for?
5) Where and when does `mount` actually get called?
6) Can `dirty` ever contain anything besides a single integer? In other words, are elements updated one after the next, or can `update` sometimes operate on more than one element at a run?
7) When are components and elements destroyed? Is Svelte as efficient about unnecessary re-renders as billed?
8) What are the setters and getters on `App` for and why are they implemented the way they are?
9) How does all this fit together? Asked another way, is it possible to have a basic understanding of how a web framework we use actually works?

We'll try to get through a few of these today, and then I'm sure more questions will emerge as we go.

# A Skinnier Bundle

This time around we're going to generate the `build.js` using `npm run build`, so as to not distract ourselves with the events that get emitted in dev mode. First, though, let's tell Rollup not to minify that file so we can actually read it:

```js
// ./rollup.config.js
...
		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!production && livereload('public'),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		// production && terser() 👈👈👈 comment this out
	],
	watch: {
...
```

`npm run build` produces this _really quite svelte_ code, which is now only about 300 lines!:

```js
// src/bundle.js
var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.ctx, $$.dirty);
            $$.dirty = [-1];
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    /* src/App.svelte generated by Svelte v3.16.0 */

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let p0;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let p1;

    	return {
    		c() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text("Hello ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			p0 = element("p");
    			t4 = text("Your lucky number is ");
    			t5 = text(/*number*/ ctx[1]);
    			t6 = text(".");
    			t7 = space();
    			p1 = element("p");
    			p1.innerHTML = `Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.`;
    			attr(h1, "class", "svelte-1tky8bj");
    			attr(main, "class", "svelte-1tky8bj");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, h1);
    			append(h1, t0);
    			append(h1, t1);
    			append(h1, t2);
    			append(main, t3);
    			append(main, p0);
    			append(p0, t4);
    			append(p0, t5);
    			append(p0, t6);
    			append(main, t7);
    			append(main, p1);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data(t1, /*name*/ ctx[0]);
    			if (dirty & /*number*/ 2) set_data(t5, /*number*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(main);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let { number } = $$props;

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("number" in $$props) $$invalidate(1, number = $$props.number);
    	};

    	return [name, number];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0, number: 1 });
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'World',
    		number: 42
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
```

This file, `bundle.js`, is what all of the following code blocks refer to, unless otherwise noted.

# Q: Where are the elements created in `create_fragment` mounted?

Here, in `init`:

```js
...
if (options.target) {
    ...
    👇👇👇👇
    mount_component(component, options.target, options.anchor);
    👆👆👆👆
    flush();
    ...
}
```

And `mount_component`, in the first two lines of its definition, destructures `fragment` from `component.$$` then calls `fragment.m`:

```js
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
...
```

As a reminder from part 1, `m` stands for "mount" (it was actually called that when compiling in dev mode), and it takes the elements created in `fragment.c` and adds them to the DOM with eminently readable and grokkable JS:

```js
m(target, anchor) {
    // these 👇👇👇 three parameters are equivalent to `document.body`, <main/>, and `undefined`
    insert(target, main, anchor);
    append(main, h1);
    append(h1, t0);
    append(h1, t1);
    append(h1, t2);
    append(main, t3);
    append(main, p0);
    append(p0, t4);
    append(p0, t5);
    append(p0, t6);
    append(main, t7);
    append(main, p1);
},
...
function append(target, node) {
    target.appendChild(node);
}

function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
```

Reminder: This is one of the things that makes Svelte great, and unique among popular frameworks: The abstractions are not so deep or complex; so far, we are never far from `document.doSomething` operations.

# Disappearing Questions

Now that we've left dev mode for our explorations, it seems that a few outstanding questions have evaporated:

## What is `__svelte_meta` for?

It doesn't appear in `bundle.js` in production mode! It's for dev tooling, must be: "Error X on line Y, character Z", and so on.

Mystery solved! 🕵

## What is the difference between `app.$set` and `app.$inject_state`, if any?

Well, their implementations are identical,

```js
// version of bundle.js in dev mode
function instance($$self, $$props, $$invalidate) {
    ... 
    $$self.$set = $$props => {
        if ("name" in $$props) $$invalidate(0, name = $$props.name);
        if ("number" in $$props) $$invalidate(1, number = $$props.number);
    };
    $$self.$inject_state = $$props => {
        if ("name" in $$props) $$invalidate(0, name = $$props.name);
        if ("number" in $$props) $$invalidate(1, number = $$props.number);
    };
    ...
}

```

annnnnddd... `$inject_state` doesn't even get defined in the production build, 

```js
// production build of bundle.js
function instance($$self, $$props, $$invalidate) {
    let { name } = $$props;
    let { number } = $$props;

    $$self.$set = $$props => {
        if ("name" in $$props) $$invalidate(0, name = $$props.name);
        if ("number" in $$props) $$invalidate(1, number = $$props.number);
    };

    return [name, number];
}
```
so let's assume it's a very careful piece of naming to distinguish what dev tools use to set state, as compared with how state is set internally in the app.  

Turns out, yep!:

{% twitter 1203024631390715912 %} 

Finally, it looks like the setter and getter methods on `App` don't appear in production mode. We can therefore scratch that question off the list, as we're not concerned with the dev tooling part of the generated code for now.

# The `$$invalidate` Callback

In the `instance` function (👆👆👆 much shorter in prod), the `$set` method is bound to `app`. Presumably this is the only way prop updates propagate through the app, so it'll behoove us to understand how it's defined in the calling code:

```js
...
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
...
    instance(component, prop_values, (i, ret, value = ret) => {
        if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
            if ($$.bound[i])
                $$.bound[i](value);
            if (ready)
                make_dirty(component, i);
        }
        return ret;
    })
```

This is hard to read, so let's write it as a normal, somewhat simplified, non-anonymous function:

```js
function invalidateProp(i, ret, value = ret) {
    const currentVal = $$.ctx[i]
    const newVal = value
    if (currentVal !== newVal) {
        // do some things with `$$.bound` and `ready` that will never trigger in the current app
    }
    $$.ctx[i] = newVal
    return ret
}
```

So if `invalidateProp` is called like so,

```js
invalidateProp(0, name = "Whirl");
```

the only things that will happen are

1) `$$.ctx[0]` will equal "Whirl"
2) "Whirl" will be returned.
3) Nothing anywhere will consume that return value in the current app.

# Hypothesis #3: `$$.bound` and `ready` Will Come Into Play If There's Some Interactive UI

Furthermore, I'm thinking `$$invalidate`'s return value might actually get used somewhere. There's plenty more to explore ahead of this test, but let's forge ahead and see what magic the compiler has for us.

## Testing Hypothesis #3

Let's make a button to increment `number`:

```html
<!-- src/App.svelte -->
<script>
	export let name;
	export let number;
</script>

<main>
    <h1>Hello {name}!</h1>
    <p>Your lucky number is {number}.</p>
    <p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
    <!-- 👇👇👇 new -->
    <button on:click={() => number += 1}>
        Make Number More Bigger
    </button>
</main>
```
Isn't Svelte so beautifully straightforward and succinct? 😍😍😍

Then, `npm run build`. To view the app, run `python3 -m http.server` from the `app` folder, then navigate to <http://localhost:8000>. Click that beautiful button and watch your lucky number mutate!

![A demonstration of the button incrementing the "lucky number"](https://thepracticaldev.s3.amazonaws.com/i/acjhmuwk4enmv41icsj7.gif)

Before hypothesis validating, `bundle.js` has some new toys for us! Here are the new lines in the resulting `bundle.js`:

```js
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);

c() {
    ...
    t11 = space();
    button = element("button");
    button.textContent = "Make Number More Bigger";
    ...
    dispose = listen(button, "click", /*click_handler*/ ctx[2]);
    // and m() mounts 👆👆👆 them
}

d(detaching) {
    if (detaching) detach(main);
    dispose();
}

function instance($$self, $$props, $$invalidate) {
    ...
    const click_handler = () => $$invalidate(0, number += 1);
    ...
    return [number, name, click_handler];
}

```
Running through the changes, there's nothing shocking. The button is added, its click handler is added to the DOM, and the click handler is set up to be removed if `App` is detached.  `click_handler` is added to `$$.ctx`.

I don't see any of my hypotheses proving out here! `$$.bound` remains an empty object, `$$invalidate`'s return value remains un-consumed, and there's still only one spot where `ready` is set to `true`, and that's _after_ `instance` is called. 

Sidenote: There was one other change, and it's really weird:

```js
class App extends SvelteComponent {
    constructor(options) {
        super();
        // 👇👇👇 before 
        // init(this, options, instance, create_fragment, safe_not_equal, { name: 0, number: 1 });
        // 👇👇👇 after 
        init(this, options, instance, create_fragment, safe_not_equal, { name: 1, number: 0 });
    }
}
```
What madness is this?! The props have inexplicably swapped their indices. Restraining myself from tweeting at Rich Harris about this one... for now. Maybe it will explain itself as we go.

# The Most Basic Knowledge We're Missing

I still don't know what actually triggers the function `update` to run! 

As a reminder, we studied `update` in part 1 because it was the only place where `$$fragment`—the object containing the methods for creating, destroying, and updating the rendered elements—was updated. As a further reminder, the key line in `update` calls `$$.fragment.p($$.ctx, $$.dirty)`, `fragment.p` being short for `fragment.update`: It checks the value of `dirty` and potentially updates the node identified by `dirty`, if the provided new value differs from the node's current one.

```js
...
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        $$.fragment && $$.fragment.p($$.ctx, $$.dirty);
        $$.dirty = [-1];
        $$.after_update.forEach(add_render_callback);
    }
}
...
function create_fragment(ctx) {
    ...
    // === $$.fragment.p
    p(ctx, [dirty]) {
        if (dirty & /*name*/ 2) set_data(t1, /*name*/ ctx[1]);
        if (dirty & /*number*/ 1) set_data(t5, /*number*/ ctx[0]);
    },
...
}

```

Conveniently, it appears the function `update` (distinct from the method `$$.fragment.p`) is called in only one place:

```js
function flush() {
    const seen_callbacks = new Set();
    do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
            const component = dirty_components.shift();
            set_current_component(component);
            update(component.$$);
        }
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                callback();
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
}
```

There's a lot here, but as with much of the code generated by Svelte with a basic app, we don't have to concern ourselves with any of the callback-related parts. This is the relevant section:

```js
...
while (dirty_components.length) {
    const component = dirty_components.shift();
    set_current_component(component);
    update(component.$$);
...
```

This is the first time we're dealing with `dirty_components`: Where is this array modified? Why, in the aptly named `make_dirty` function.
 
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

And where is `make_dirty` called?

```js
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    ...
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, value = ret) => {
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
...
}
```

This is a bit confusing, though, because `make_dirty` is only called if `ready` is `true`, and `ready` appears to be false when the `$$invalidate` callback is defined. 

{% twitter 1203955045093523456 %}

~~For now we're going to skate right past the scope monster and accept the mystery of `ready`'s truthiness.~~

Thank you to my fellow Recurse Center alum Thomas Ballinger for demystifying this: 

{% twitter 1204039246421487616 %}

(Yup, it was a scope monster, or to put it another way, "scope".)

Given that truthiness, this means when `invalidateProp` is called, `make_dirty` gets called with the `App` instance for `component` and the _index_ of whatever prop has been modified.

The function `make_dirty`

1) adds the component (`App` instance here) to an array called `dirty_components`
2) does something confusing in `schedule_update`, but, importantly, calls `flush`
3) updates `component.$$.dirty` 

```js
dirty_components.push(component);
schedule_update();
component.$$.dirty.fill(0);
```

So we've found where `dirty_components` is mutated, and as a bonus, where `flush` gets called (`schedule_update`).

We'll study the `Array.fill` call in a moment, but returning to `flush`'s definition, it appears that `dirty_components` is being used as a queue:

```js
const component = dirty_components.shift();
set_current_component(component);
update(component.$$);
```

The meaning of `current_component` doesn't seem important in this early moment when there's only a single component in our app. This makes the only interesting code here the call to `update`, which as we already know triggers `set_data` on any relevant elements.

## The Last Piece

We nearly have the full picture of how prop changes make their way through `bundle.js`. There is a curveball with respect to our current understanding, though:

### What is `$set` For???

`app.$set` is never called in our app: It appears to be a debugging utility, or maybe a hook for external tools. So this function isn't part of the pipeline of functions handling prop changes.

### So Where? Sneaky Succinctness 

It took me a bit of `console.log`-ging to realize where the pipeline begins:

```js
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, value = ret) => {
            //                             right here 👇👇👇
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
```

It isn't clear to me at all why this anonymous function runs more than once (on `App` instantiation), but it can be demonstrated that it does with

```js
    ...
    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = "default")) {
    ...
```

Which functions like so:

![Animated GIF showing that when you click the number-incrementing button, it changes from 42 to the word "default" and remains so after additional presses](/Users/zev/Downloads/2019-12-09 15.33.11.gif)

This is a bit sneaky, stuffing a variable reassignment inside a function call! Nevertheless, we now have the pipeline mapped:

# Props Pipeline

1) `init`: `if(not_equal($$.ctx[i], $$.ctx[i] = value))` (the assignment there)
2) `init`: `make_dirty(component, i);`
3) `make_dirty`: `dirty_components.push(component);`
4) `make_dirty`: `schedule_update();`
5) `make_dirty`: `component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));`
5) `schedule_update`: `resolved_promise.then(flush);` (equivalent to `flush()`)
6) `flush`: `while (dirty_components.length) update(component.$$);`
7) `update`: `$$.fragment.p($$.ctx, $$.dirty);`
8) `$$.fragment.p`: `if (dirty & /*name*/ 2) set_data(t1, /*name*/ ctx[1]);`
9) `set_data`: if `(text.data !== data) text.data = data;`

A note about `resolved_promised.then`: It _isn't_ exactly the same as calling `flush`, as even though `schedule_update` is called before `component.$$.dirty` is mutated, that mutation has taken place by the time `flush` executes here. The mechanism for this isn't clear to me yet.

There's actually a variation on the start of this pipeline, as `$$invalidate` _is_ actually called in the click handler:

```js
function instance($$self, $$props, $$invalidate) {
    ...
    const click_handler = () => $$invalidate(0, number += 1);
    ...
}

function create_fragment(ctx) {
    ...
    c() {
        dispose = listen(button, "click", /*click_handler*/ ctx[2]);
        ...
    }
...
}

1) *click*
2) `instance`: `const click_handler = () => $$invalidate(0, number += 1);`
3) 1-9 above

```


# Still Outstanding Questions

1) How does `bundle.js` change with increasing app complexity? Multiple components, for example, or dynamically re-rendering props/state.
2) Can `dirty` ever contain anything besides a single integer? In other words, are elements updated one after the next, or can `update` sometimes operate on more than one element at a run?
3) When are components and elements destroyed? Are Svelte and Rollup as efficient about unnecessary re-renders as billed?
4) Is it a security problem that the user can directly manipulate the state from a browser's JavaScript console?

# New Questions
1) how do `$$.bound` and `ready` figure into `init`?
2) This has been there all along, but why the `space()`s in `block`?
3) What is `outroing`? An inside joke? Obscure British slang? Both? 🎩
4) Why does Rollup/Svelte compiler include "name" in the $set binding (in `instance`) when it currnetly will never be mutated?
5) Why did `number` and `name` swap position in the call to `init` when `number` got attached to an event listener?
6) What's this business doing exactly? `component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));`

