const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.gpt = async (prompt, max, temp) => {
  return new Promise( async (resolve, reject) => {
    if (!prompt) {
      return reject(new Error("Prompt argument required"));
    }
    try {
      console.log('GPT API call')
      const openAIGPT3Response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: prompt}],
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });
      const response = openAIGPT3Response.data.choices[0].message.content;
      console.log('GPT API call success')
      console.log('GPT API call response: ', response)
      resolve(response)
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
};
