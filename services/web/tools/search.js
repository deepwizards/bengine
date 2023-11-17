const SerpApi = require('google-search-results-nodejs');
const search = new SerpApi.GoogleSearch(process.env.SERP_KEY);

exports.search = async (query) => {
	return new Promise( async (resolve, reject) => {
		try {
			if (!query) {
				throw new Error('Must provide a query!');
			}
			search.json({
				q: query,
				location: 'Austin, TX'
			}, (data) => {
				resolve(data)
			});
		} catch (error) {
			console.error(error);
			reject(error);
		}
	});
};
