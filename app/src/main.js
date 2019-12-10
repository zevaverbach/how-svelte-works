import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'World',
		number: 42
	}
});

export default app;
