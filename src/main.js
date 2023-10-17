import { OpenAIApi, Configuration } from 'openai';
import { getStaticFile, throwIfMissing } from './utils.js';
import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res }) => {
  throwIfMissing(process.env, ['OPENAI_API_KEY', 'APPWRITE_API_KEY']);

  const appwriteClient = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('mlhghw')
    .setKey(process.env.APPWRITE_API_KEY);

  const appwriteDatabases = new Databases(appwriteClient);

  if (req.method === 'GET') {
    return res.send(getStaticFile('index.html'), 200, {
      'Content-Type': 'text/html; charset=utf-8',
    });
  }

  try {
    throwIfMissing(req.body, ['prompt']);
  } catch (err) {
    return res.json({ ok: false, error: err.message }, 400);
  }

  const openai = new OpenAIApi(
    new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
  );

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS ?? '512'),
      messages: [{ role: 'user', content: req.body.prompt }],
    });
    const completion = response.data.choices[0].message?.content;

    log(completion);

    await appwriteDatabases.createDocument(
      'testdb',
      'testcoll',
      ID.unique(),
      {
        prompt: req.body.prompt,
        answer: completion
      }
    );

    return res.json({ ok: true, completion }, 200);
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: 'Failed to query model.' }, 500);
  }
};
