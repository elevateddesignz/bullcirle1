// testOpenAI.cjs
const { Configuration, OpenAIApi } = require('openai');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(configuration);
  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: "Say hello",
      max_tokens: 10,
    });
    console.log("OpenAI Test Response:", completion.data);
  } catch (error) {
    console.error("OpenAI Test Error:", error);
  }
})();
