<template>
	<div>
    <div class="">
        <div class="container">
            <div class="columns is-centered">
                <div class="column is-10-fullhd is-11-widescreen is-12-desktop is-12-tablet">
                    <section class="section">
                        <h1 class="title is-2 has-text-platinum has-text-centered pb-20">Category Allocations</h1>
                        <div v-if="locked" class="has-text-light has-text-centered">
                            <section class="hero is-fullheight-with-navbar section has-background-dark">
                                <h2 class="title is-3">You cannot see allocations at this time.</h2>
                            </section>
                        </div>
						<div v-else-if="loaded">
						<div class="has-text-light has-text-centered">
							Allocations are subject to change based on feedback. To provide feedback, please <a @click="modalOpen = true">click here</a>.
						</div>
						<br/><br/>
                        <div class="columns is-centered">
                            <div class="column is-2">
                                <nav class="panel is-platinum has-background-white">
                                    <p class="panel-heading">Categories</p>
                                    <AllocationLink
									v-for="category in filteredCategories"
									:key="category.id"
									@input="changeCategory(category)"
									:name="category.name"
									v-model="selectedCategory"
									/>
                                </nav>
                            </div>
                            <div class="column is-10">
                                <div class="show-picker">
                                    <div class="show-picker-overflow-wrap">
                                        <div class="show-picker-search-bar">
                                            <div class="field has-addons">
                                                <p class="control has-icons-left is-expanded">
                                                    <input class="input is-expanded has-text-dark" type="text" :value="search" @input="handleInput($event)" placeholder="Search by title..." />
                                                    <span class="icon is-small is-left">
                                                        <i class="fas fa-search" />
                                                    </span>
                                                </p>
                                                <div class="control">
                                                    <span class="button is-static" :class="{'is-loading': !fetched}">
                                                        {{total}} show{{total === 1 ? '' : 's'}}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div v-if="fetched && shows.length" class="show-picker-entries">
                                            <AllocationCard v-for="show in shows" :key="show.id" :show="show"/>
                                        </div>
                                        <div v-else-if="fetched" class="show-picker-text">
                                            {{search ? 'No results :(' : ''}}
                                        </div>
										<div v-else class="show-picker-text has-text-light">
											Loading...
										</div>
                                    </div>
                                </div>
                            </div>
                        </div>
						<!--
						<section class="section has-text-centered">
							<a @click="modalOpen = true" class="title is-3 has-text-platinum has-text-centered pb-20">Have any issues with the allocations? Click here to tell us!</a>
						</section>
						-->
						</div>
                        <section class="hero is-fullheight-with-navbar section has-background-dark" v-else>
                            <div class="container">
                                <div class="columns is-desktop is-vcentered">
                                    <div class="column is-9-fullhd is-10-widescreen is-11-desktop is-12-mobile">
                                        <div class="section">
                                            <div class="loader is-loading"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </section>
                </div>
            </div>
        </div>
    </div>
	<modal-generic v-model="modalOpen">
		<div class="field">
			<label class="label has-text-dark">Message</label>
			<div class="control">
				<textarea v-model="message" class="textarea has-text-dark" maxlength="1985" placeholder="e.g X show should be in Y category"/>
			</div>
			<p class="help is-platinum">{{message.length}}/1985</p>
		</div>
		<div v-if="sent" class="field">
			<div class="control">
				<div class="has-text-centered has-text-platinum">
					Your feedback has been recorded!
				</div>
			</div>
		</div>
		<div class="field">
			<div class="control">
				<button @click="sendMessage" class="button is-primary" :class="{'is-loading': submitting}">Submit</button>
			</div>
		</div>
		</modal-generic>
	</div>
</template>


<script>
import ModalGeneric from '../../common/ModalGeneric';
import {mapState, mapActions} from 'vuex';
import AllocationCard from '../components/AllocationCard';
import AllocationLink from '../components/AllocationLink';
import Fuse from 'fuse.js/dist/fuse.basic.min';
const util = require('../../util');
const aq = require('../../anilistQueries');

const options = {
	shouldSort: true,
	threshold: 0.3,
	location: 0,
	distance: 70,
	maxPatternLength: 64,
	minMatchCharLength: 3,
	keys: [
		'title.romaji',
		'title.english',
		'synonyms',
	],
};

export default {
	components: {
		AllocationCard,
		AllocationLink,
		ModalGeneric,
	},
	data () {
		return {
			loaded: false,
			fetched: false,
			locked: false,
			shows: [],
			showData: [],
			selectedCategory: null,
			search: '',
			total: 'No',
			message: '',
			modalOpen: false,
			submitting: false,
			sent: false,
		};
	},
	computed: {
		...mapState(['locks', 'categories', 'entries', 'items']),
		filteredCategories () {
			return this.categories.filter(category => category.entryType === 'shows' && category.name !== 'Anime of the Year' && category.awardsGroup !== 'character' && (category.awardsGroup !== 'production' || category.name === 'OST'));
		},
		filteredEntries () {
			return this.entries.filter(entry => entry.categoryId === this.selectedCategory.id);
		},
		showIDs () {
			const entries = this.entries.filter(entry => entry.categoryId === this.selectedCategory.id && entry.search != 'internal');
			return entries.map(entry => entry.anilist_id);
		},
	},
	methods: {
		...mapActions(['getLocks', 'getCategories', 'getEntries', 'getItems']),
		changeCategory (category) {
			this.search = '';
			this.total = 'No';
			this.fetched = false;
			this.selectedCategory = category;
			this.fetchAnilist();
		},
		handleInput (event) {
			// TODO - this could just be a watcher
			this.search = event.target.value;
			this.fetched = false;
			clearTimeout(this.typingTimeout);
			this.typingTimeout = setTimeout(() => {
				this.sendQuery();
			}, 750);
		},
		sendQuery () {
			if (!this.search) {
				this.fetched = true;
				this.shows = this.showData;
				this.total = 'No';
				return;
			}
			const fuse = new Fuse(this.shows, options);
			this.shows = fuse.search(this.search);
			this.shows = this.shows.map(show => show.item);
			this.total = this.shows.length;
			this.fetched = true;
		},
		getCustomShow(show){
			const custitem = this.items.find(item => item.id === show);

			return {
				"id": custitem.anilist_id,
				"title":{"romaji":custitem.romanji,"english":custitem.english},
				"coverImage":{
					"large": custitem.image,
					"extraLarge": custitem.image},
				"siteUrl":"#",
				"idMal": null
			};
		},
		async fetchAnilist () {
			const promiseArray = [];
			let showData = [];
			let page = 1;
			const someData = await util.paginatedQuery(aq.showQuerySimple, this.showIDs, page);
			showData = [...showData, ...someData.data.Page.results];
			const lastPage = someData.data.Page.pageInfo.lastPage;
			page = 2;
			while (page <= lastPage) {
				// eslint-disable-next-line no-loop-func
				promiseArray.push(new Promise(async (resolve, reject) => {
					try {
						const returnData = await util.paginatedQuery(aq.showQuerySimple, this.showIDs, page);
						resolve(returnData.data.Page.results);
					} catch (error) {
						reject(error);
					}
				}));
				page++;
			}
			Promise.all(promiseArray).then(finalData => {
				for (const data of finalData) {
					showData = [...showData, ...data];
				}
				this.showData = showData;
				this.shows = showData;
				for (const show of this.entries.filter(entry => entry.categoryId === this.selectedCategory.id && entry.search == 'internal')){
					this.shows.push(this.getCustomShow(show.anilist_id));
				}
				this.fetched = true;
			});
		},
		async sendMessage () {
			this.submitting = true;
			const response = await fetch('/api/complain/allocations', {
				method: 'POST',
				body: JSON.stringify(this.message),
			});
			if (response.ok) {
				setTimeout(() => {
					this.sent = true;
					this.submitting = false;
				}, 2000);
			} else if (response.status === 500) {
				// eslint-disable-next-line no-alert
				alert('Your feedback could not be sent.');
				this.submitting = false;
			} else if (response.status === 401) {
				// eslint-disable-next-line no-alert
				alert('You are submitting too many times. Please come back later.');
				this.submitting = false;
			}
		},
	},
	mounted () {
		Promise.all([this.locks ? Promise.resolve() : this.getLocks(),
			this.entries ? Promise.resolve() : this.getEntries(),
			this.items ? Promise.resolve() : this.getItems(),
			this.categories ? Promise.resolve() : this.getCategories()]).then(async () => {
			this.selectedCategory = this.filteredCategories[0];
			const allocLock = this.locks.find(lock => lock.name === 'allocations');
			if (!allocLock.flag) {
				this.locked = true;
				this.loaded = true;
				return;
			}
			await this.fetchAnilist();
			this.loaded = true;
		});
	},
};
</script>
