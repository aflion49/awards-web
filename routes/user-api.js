const log = require('another-logger');
const apiApp = require('polka')();
const superagent = require('superagent');
const sequelize = require('../models').sequelize;

// Sequelize models to avoid redundancy
const Users = sequelize.model('users');
const Votes = sequelize.model('votes');

apiApp.get('/me', async (request, response) => {
	if (!request.session.redditAccessToken) {
		return response.json(401);
	}
	let redditorInfo;
	try {
		redditorInfo = (await request.reddit().get('/api/v1/me')).body;
	} catch (error) {
		return response.error(error);
	}
	try {
		Users.findOne({
			where: {
				reddit: redditorInfo.name,
			},
		}).then(user => {
			if (!user) {
				return response.json(404, null);
			}
			response.json({
				reddit: {
					name: redditorInfo.name,
					avatar: redditorInfo.subreddit.icon_img,
					created: redditorInfo.created_utc,
				},
				level: user.level,
				flags: user.flags,
			});
		});
	} catch (error) {
		return response.error(error);
	}
});

apiApp.get('/all', (request, response) => {
	Users.findAll().then(users => {
		response.json(users);
	});
});

apiApp.post('/', async (request, response) => {
	let user;
	try {
		user = await request.json();
	} catch (error) {
		return response.json({error: 'Invalid JSON'});
	}
	if (!await request.authenticate({level: user.level + 1})) {
		return response.json(401, {error: 'You can only set users to levels below your own'});
	}
	log.info(user);
	const userInfo = await Users.findOne({
		where: {
			reddit: user.reddit,
		},
	});
	if (userInfo) {
		log.info('user already present');
		return response.json(400, {error: 'That user is already present'});
	}
	let redditResponse;
	try {
		redditResponse = await superagent.get(`https://www.reddit.com/user/${user.reddit}/about.json`);
	} catch (error) {
		return response.json(400, {error: 'That user does not have a Reddit account'});
	}
	// replace the name with the one from reddit in case the capitalization is different
	user.reddit = redditResponse.body.data.name;
	try {
		await Users.create(user);
		response.json(user);
	} catch (error) {
		response.error(error);
	}
});

apiApp.delete('/:reddit', async (request, response) => {
	const redditName = request.params.reddit;
	if (!redditName) {
		return response.json(400, {error: 'Missing reddit name of user to delete'});
	}
	let userInfo;
	try {
		userInfo = await Users.findOne({
			where: {
				reddit: redditName,
			},
		});
	} catch (error) {
		return response.error(error);
	}
	if (!userInfo) {
		return response.json(400, {error: 'The specified user does not exist'});
	}
	if (!await request.authenticate({level: userInfo.level + 1})) {
		return response.json(401, {error: 'You can only remove users of lower level than yourself'});
	}
	try {
		await Users.destroy({
			where: {
				reddit: redditName,
			},
		});
		response.empty();
	} catch (error) {
		response.error(error);
	}
});

apiApp.post('/deleteaccount', async (request, response) => {
	const name = (await request.reddit().get('/api/v1/me')).body.name;
	try {
		Users.destroy({where: {reddit: name}});
		Votes.destroy({where: {reddit_user: name}});
		request.session.destroy(() => {
			response.empty();
		});
	} catch (error) {
		response.error(error);
	}
});

module.exports = apiApp;
