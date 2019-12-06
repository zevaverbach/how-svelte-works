# How Does Svelte Actually Work? part 2 

[Here's part 1](https://dev.to/zev/how-does-svelte-actually-work-part-1-j9m), but the summary below might be enough to catch you up.

# Episode Recap

On the previous episode of HDSAW we took a bewildering ride through the 400 or so lines of vanilla JavaScript the Svelte compiler produces from [the sample app](https://github.com/sveltejs/template). Here's [that vanilla JS](https://gist.github.com/zevaverbach/83901aed1230fbd3adb01b96a7be0572) for your perusal, and see below for an updated version for part 2.

## What We've Learned So Far

When we run `npm run dev` to compile the sample app, Rollup takes the contents of `main.js` and runs the Svelte compiler on it. This produces a file called `bundle.js` in the `src` directory.

`bundle.js` defines and immediately calls an anonymous function, creating an instance of `App` called `app`. The code which runs inside the constructor of `App` first renders the Svelte app, then binds a small handful of methods to the instance. These methods can be used to get and set the state of the app, including by the user at the console! 

## Outstanding Questions

1) Is it a security problem that the user can directly manipulate the state from a browser's JavaScript console?
2) What is the difference between `app.$set` and `app.$inject_state`, if any?
3) How does `bundle.js` change with increasing app complexity? Multiple components, for example, or dynamically re-rendering props/state.
4) What is `__svelte_meta` for?
5) Where and when does `mount` actually get called?
6) Can `dirty` ever contain anything besides a single integer? In other words, are elements updated one after the next, or can `update` sometimes operate on more than one element at a run?
7) When are components and elements destroyed? Are Svelte and Rollup as efficient about unnecessary re-renders as billed?
8) How does all this fit together? Asked another way, is it possible to have a basic understanding of how a web framework we use actually works?

We'll try to get through a few of these today.

# A Skinnier Bundle

You see what I did there? This time around we're going to generate the `build.js` using `npm run build`, so as to not distract ourselves with the events that get emitted in dev mode. First, though, let's tell Rollup not to minify that file so we can actually read it:

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
