const fetch = require("node-fetch");
const { GEMINI_MODEL, getGeminiPrompt, getGeminiSystemInstructions } = require("../config");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

async function validateAPIKey(apiKey) {
	if (!apiKey || apiKey === "") {
		return false;
	}

	// Create the request payload
	const data = {
		contents: [
			{
				parts: [{ text: 'Say "hi"' }],
			},
		],
	};

	try {
		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-goog-api-key": apiKey,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			return false;
		}

		const responseData = await response.json();
		return responseData ? true : false;
	} catch (error) {
		return false;
	}
}

async function getGeminiRecs(title, year, mediaType, apiKey) {
	try {
		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({
			model: GEMINI_MODEL,
			systemInstruction: await getGeminiSystemInstructions(mediaType),
			generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
		});

		const cleanedTitle = title.replace(/[^\p{L}\p{N} ]/gu, "");

		const prompt = await getGeminiPrompt(cleanedTitle, year, mediaType);
		const result = await model.generateContent(prompt);

		return await parseGeminiReturn(result.response.text());
	} catch (error) {
		logger.error(error.message, null);
		// Fallback so model/API failures surface even when file logging (ENABLE_LOGGING) is off
		console.error(`[gemini] getGeminiRecs failed: ${error.message}`);
		return null;
	}
}

async function parseGeminiReturn(str) {
	// Split the input string by newlines to get each movie data
	const rows = str.split("\n");

	// Map each row to an object with title and year
	const recs = rows
		.filter((row) => row.trim() !== "") // Remove blank rows
		.map((row) => {
			const [title, year] = row.split(",");
			return {
				title: title ? title.trim() : "",
				year: year ? year.trim() : "",
			};
		});

	return recs;
}

module.exports = {
	validateAPIKey,
	getGeminiRecs,
};
