const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const upload = multer({ dest: 'analyse/' });

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up the openAPI endpoint, upload the resume file to OpenAI,
// constraining the JSON format response and include a custom prompt.
app.post('/analyze', upload.single('resume'), (req, res) => {
    const resumeFile = req.file; // Uploaded resume file

    const openAIKey = process.env.OPENAI_API_KEY;
    const openAIClient = require('@openai/api-client').Client.create({ apiKey: openAIKey });

    const prompt = 'You are a HR specialist assistant. You are procesing resume that we are providing and return list of experience title and skills (for each experience), matching ESCO standard';

    const formData = {
        prompt,
        file: {
            path: resumeFile.path,
            filename: resumeFile.originalname,
            contentType: resumeFile.mimetype,
        },
    };

    const responseSchema = {
        type: 'object',
        properties: {
            experience: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        skills: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                },
            },
        },
    };

    openAIClient.createCompletion({
        engine: 'gpt-4o-mini', // Use the GPT-4o mini model
        files: formData,
        maxTokens: 1000,
        response_schema: responseSchema,
    })
       .then((response) => {
            const analysisResults = JSON.parse(response.data.choices[0].text);
            res.json(analysisResults);
        })
       .catch((error) => {
            console.error('Error analyzing resume:', error);
            res.status(500).send('Error analyzing resume');
        });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
