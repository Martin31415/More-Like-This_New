const tmdb = require("../services/tmdb");
const rpdb = require("../services/rpdb");
const cinemeta = require("../services/cinemeta");
const idConverter = require("../utils/idConverter");
const { generateFullMeta } = require("./metadata");

async function createMetaPreview(recs, type, apiKeys, metadataSource) {
	const imdbId = recs.imdbId;
	let tmdbId = recs.tmdbId;

	// Get RPDB poster if valid API key provided
	const rpdbApi = apiKeys.rpdb;
	let rpdbPoster = null;
	if (rpdbApi.valid) {
		rpdbPoster = await rpdb.getRPDBPoster(imdbId, rpdbApi.key);
	}

	//const meta = await generateFullMeta(imdbId, type, metadataSource);
	const meta = null;

	if (metadataSource.source === "cinemeta") {
		// Fetch the full Cinemeta entry so the tile carries a name/rating (not just a poster).
		// Without a name, tiles render as blank boxes in Stremio whenever the poster fails to load.
		const baseMeta = await cinemeta.fetchBaseMetadata(imdbId, type);
		const poster = rpdbPoster || baseMeta?.poster;

		return poster
			? {
					id: imdbId,
					type: type,
					poster: poster,
					background: baseMeta?.background || poster,
					name: baseMeta?.name,
					releaseInfo: baseMeta?.releaseInfo,
					description: baseMeta?.description,
					imdbRating: baseMeta?.imdbRating,
			  }
			: null;
	} else if (metadataSource.source === "tmdb") {
		// If no rpdbPoster, fetch TMDB poster
		let poster = rpdbPoster;
		if (!poster) {
			const keepEnglishPoster = metadataSource.keepEnglishPosters;
			const language = keepEnglishPoster ? "en" : metadataSource.language;

			if (!tmdbId) {
				tmdbId = await idConverter.imdbToTmdb(imdbId, type, apiKeys.tmdb.key);
			}

			let tmdbPoster = await tmdb.fetchPoster(tmdbId, type, apiKeys.tmdb.key, language);

			// If poster not available in desired language, default to english posters
			if (!tmdbPoster) {
				tmdbPoster = await tmdb.fetchPoster(tmdbId, type, apiKeys.tmdb.key, "en");
			}

			poster = tmdbPoster;
		}

		return poster
			? {
					id: "mlt-meta-" + imdbId,
					type: type,
					poster: poster,
					background: meta?.background || poster,
					name: meta?.name,
					releaseInfo: meta?.year,
					description: meta?.description,
			  }
			: null;
	}
}

module.exports = {
	createMetaPreview,
};
