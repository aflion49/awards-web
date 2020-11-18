// Import style stuff
import '../styles/utilities.scss';

// Import libraries
import Vue from 'vue';
import store from './store';
import router from './routes';

router.beforeEach(async (to, from, next) => {
	if (to.path.startsWith('/vote')) {
		// Get user data
		if (!store.state.me) await store.dispatch('getMe');
		if (!store.state.me) {
			// The user is not logged in, so have them log in
			window.location.href = '/auth/reddit/vote';
			return;
		}
		// The user is logged in, send them to the next page
		return next();
	}
	// If path is different
	next();
});

import App from '../common/HostVoteApp';

const vm = new Vue({
	store,
	router,
	render: create => create(App),
});

vm.$mount('#app');
