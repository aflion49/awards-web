<!--I swear I didn't copy and paste everything here because I'm too lazy to figure out proper routing. In any case, if stuff changes, do stuff here.-->
<template>
	<label class="va-picker-entry">
		<div class="box">
			<div class="media">
				<div class="media-left">
					<figure class="image va-cover">
						<img :src="coverURI"/>
					</figure>
				</div>
				<div class="media-content">
					<div class="content">
						<p>
							<em class="va-title">
								{{name}} ({{voiceActor}})
							</em>
							<br/>
							{{anime}}
							<br/>
							&bull;
							<a
								@click.stop
								target="_blank"
								:href="anilistLink"
							>
								AniList
							</a>
						</p>
					</div>
				</div>
				<div class="media-right">
					<input class="item-picker-entry-cb" type="checkbox" @change="checkboxChange" :checked="selected"/>
				</div>
			</div>
		</div>
	</label>
</template>

<script>
export default {
	props: {
		va: Object,
		selected: Boolean,
	},
	computed: {
		name () {
			if (this.va && this.va.parent) {
				return this.va.parent.romanji || this.va.parent.english;
			} else {
				return "";
			}
		},
		voiceActor () {
			return this.va.romanji || this.va.english;
		},
		year () {
			return this.va.year;
		},
		anime () {
			if (this.va && this.va.parent) {
				if (this.va.parent.parent) {
					return this.va.parent.parent.romanji || this.va.parent.parent.english;
				}
			}
			return "";
		},
		format () {
			return ''; // readableFormats[this.char.format];
		},
		coverURI () {
			return this.va.image;
		},
		anilistLink () {
			return 'https://anilist.co/character/' + this.va.anilistID;
		},
	},
	methods: {
		checkboxChange (event) {
			event.target.checked = this.selected;
			this.$emit('action', !this.selected);
		},
	},
};
</script>

<style lang="scss">
.va-cover {
    width: 64px;
    margin-right: 0.4rem;
    border-radius: 3px;
    overflow: hidden;
}
</style>
