import { defineConfig } from 'vitepress'

export default defineConfig({
	title: "tempo-fns",
	description: "The standard functional library for Temporal.",
	base: "/magma/functions/",
	vite: {
		build: {
			target: 'es2022'
		},
		esbuild: {
			target: 'esnext'
		},
		optimizeDeps: {
			esbuildOptions: {
				target: 'esnext'
			}
		},
		ssr: {
			noExternal: ['vue', '@vue/server-renderer']
		}
	},
	themeConfig: {
		logo: '/img/functions-logo.svg',
		nav: [
			{ text: 'Home', link: '/' },
			{ text: 'Functions', link: '/functions/' }
		],

		sidebar: [
			{
				text: 'Overview',
				items: [
					{ text: 'Introduction', link: '/functions/' }
				]
			},
			{
				text: 'Categories',
				items: [
					{ text: 'Business', link: '/functions/business/' },
					{ text: 'Calendar', link: '/functions/calendar/' },
					{ text: 'Scheduling', link: '/functions/scheduling/' },
					{ text: 'Timezone', link: '/functions/timezone/' },
					{ text: 'Duration', link: '/functions/duration/' }
				]
			},
			{
				text: 'Support',
				items: [
					{ text: 'Community & Support', link: '/support' }
				]
			}
		],

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/magmacomputing/magma' }
		]
	}
})
