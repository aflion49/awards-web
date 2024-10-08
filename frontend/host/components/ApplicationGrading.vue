<template>
	<div v-if="loaded && !locked">
		<div class="section">
			<div class="level title-margin">
				<div class="level-left">
					<div class="level-item">
						<div class="control">
							<h2 class="title is-3">Grading</h2>
						</div>
					</div>
				</div>
				<div class="level-right">
					<div class="level-item">
						<div class="control">
							<div class="select is-small">
								<select v-model="selectedQuestionID">
									<option value="-1">Please select a question...</option>
									<option :value="question.id" v-for="(question, index) in questions" :key="index">{{question.question}}</option>
								</select>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="level title-margin">
				<div class="level-left"></div>
				<div class="level-right">
					<div v-if="selectedQuestionID !== '-1'" class="level-item">
						<div class="control">
							<button @click="randomAnswer()" class="button is-primary">Get new answer</button>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div :key="currentAnswer ? `${selectedQuestionID}-${currentAnswer.id}` : `${selectedQuestionID}`" class="section">
			<div v-if="selectedQuestionID === '-1'">
				Please select a question to grade first.
			</div>
			<div v-else-if="fetching">
				Checking answers. Please wait...
			</div>
			<div v-else-if="!currentAnswer && selectedQuestionID !== '-1'">
				You have graded all answers for this question.
			</div>
			<div v-else>
				<div class="field">
					<h2 class="title is-4">{{currentAnswer.applicant.id}}'s Answer</h2>
					<div class="control">
						<Viewer :initialValue="currentAnswer.answer"/>
					</div>
				</div>
				<div v-for="(subgrade, index) in currentQuestionSubgrades" :key="index">
					<h2 class="title is-4">{{subgrade}}</h2>
					<div v-if="currentAnswer.scores.length" class="field">
						<h2 class="title is-4">Notes From Other Hosts</h2>
						<div class="control">
							<li v-for="score in currentAnswer.scores" :key="score.id">
								<span v-if="score.subgrade === subgrade">
									{{score.host_name}}: <b>{{score.score}}</b>{{score.note ? ` (${score.note})` : ''}}
								</span>
							</li>
						</div>
					</div>
					<div class="field">
						<h2 class="title is-6">Your Score</h2>
						<div class="control">
							<input type="text" class="input" v-model="score[subgrade]" placeholder="Value between 0 and 4"/>
						</div>
					</div>
					<div class="field">
						<h2 class="title is-6">Your Notes</h2>
						<div class="control">
							<input type="text" class="input" v-model="note[subgrade]" placeholder="Notes for other hosts"/>
						</div>
					</div>
					<div class="field">
						<div class="control">
							<button @click="submitScore(subgrade)" class="button is-primary" :class="{'is-loading': submitting}">Confirm score</button>
						</div>
					</div>
					<br/>
				</div>
			</div>
		</div>
	</div>
	<div v-else-if="locked">
		You cannot grade applications at this time.
	</div>
	<div v-else-if="!loaded">
		Loading...
	</div>
</template>

<script>
import '@toast-ui/editor/dist/toastui-editor-viewer.css';
import {Viewer} from '@toast-ui/vue-editor';
import {mapActions, mapState} from 'vuex';

export default {
	components: {
		Viewer,
	},
	props: {
		application: Object,
	},
	data () {
		return {
			loaded: false,
			locked: null,
			selectedQuestionID: '-1',
			currentAnswer: null,
			score: [],
			note: [],
			filteredQuestionGroups: null,
			submitting: false,
			fetching: false,
		};
	},
	computed: {
		...mapState(['me', 'questionGroups', 'locks']),
		questions () {
			const arr = [];
			for (const questionGroup of this.filteredQuestionGroups) {
				for (const question of questionGroup.questions) {
					if (question.type === 'essay') arr.push(question);
				}
			}
			return arr;
		},
		currentQuestionSubgrades () {
			for (const questionGroup of this.filteredQuestionGroups) {
				for (const question of questionGroup.questions) {
					if (question.id == this.selectedQuestionID){
						return question.subgrades.replace(' ', '').split(',');
					}
				}
			}
		}
	},
	methods: {
		...mapActions(['getMe', 'getQuestionGroups', 'getLocks']),
		async randomAnswer () {
			this.fetching = true;
			if (this.selectedQuestionID === '-1') {
				this.currentAnswer = null;
			} else {
				const response = await fetch(`/api/juror-apps/random-answer/${this.selectedQuestionID}`, {
					method: 'GET',
				});
				if (response.status === 204) {
					this.currentAnswer = null;
				} else {
					this.score = [];
					this.note = [];
					this.currentAnswer = await response.json();
				}
			}
			this.fetching = false;
		},
		async submitScore (subgrade) {
			let submitedScore = parseInt(this.score[subgrade], 10);
			if (submitedScore === submitedScore && submitedScore >= 0 && submitedScore <= 4 && this.note[subgrade].length) {
				this.submitting = true;
				const score = await fetch('/api/juror-apps/score', {
					method: 'POST',
					body: JSON.stringify({
						answer_id: this.currentAnswer.id,
						score: parseInt(this.score[subgrade], 10),
						note: this.note[subgrade],
						subgrade: subgrade,
						host_name: this.me.reddit.name,
					}),
				});
				if (!score.ok) {
					// eslint-disable-next-line no-alert
					alert('Something went wrong submitting the score.');
				}
				this.submitting = false;
				// this.randomAnswer();
			} else {
				// eslint-disable-next-line no-alert
				alert('Please enter a valid score and a note.');
			}
		},
	},
	watch: {
		selectedQuestionID () {
			this.randomAnswer();
		},
	},
	async mounted () {
		if (!this.me) {
			await this.getMe();
		}
		if (!this.questionGroups) {
			await this.getQuestionGroups();
		}
		if (!this.locks) {
			await this.getLocks();
		}
		const gradingLock = this.locks.find(lock => lock.name === 'grading-open');
		if (gradingLock.flag || this.me.level > gradingLock.level) {
			this.locked = false;
			this.filteredQuestionGroups = this.questionGroups.filter(qg => qg.application.id === this.application.id);
		} else {
			this.locked = true;
			this.filteredQuestionGroups = [];
		}
		this.loaded = true;
	},
};
</script>
