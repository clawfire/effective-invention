require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const OpenAIApi = require('openai');

const app = express();
const upload = multer({ dest: 'analyse/' });

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
console.log(process.env['OPENAI_API_KEY'] ? '✅ API key is set' : '❌ API key is not set');

// Set up the openAPI endpoint, upload the resume file to OpenAI,
// constraining the JSON format response and include a custom prompt.
app.post('/analyze', upload.single('resume'), (req, res) => {
    const resumeFile = req.file; // Uploaded resume file
    if (!resumeFile) {
        console.error('❌ No resume file uploaded.');
        return res.status(400).send('No resume file uploaded.');
    }

    const openAI = new OpenAIApi({
        apiKey: process.env['OPENAI_API_KEY'],
    });
    console.log(`Analyzing resume: ${resumeFile.originalname}`);
    const prompt = 'You are a HR specialist assistant. Analyze the following resume document to extract all ESCO/ISCO-08 occupations and skills explicitly mentioned. The output should follow the given JSON schema structure: 1. Occupations: Identify ESCO/ISCO-08 occupations explicitly mentioned in the document. For each occupation, extract its English name and any skills with their English name explicitly linked to that occupation. 2. Skills: Identify any ESCO skills mentioned in the resume that are not explicitly linked to a specific occupation and list them separately with their English names.';

    // Prepare the input data for the OpenAI API call
    const formData = {
        prompt,
        file: {
            path: resumeFile.path,
            filename: resumeFile.originalname,
            contentType: resumeFile.mimetype,
        },
    };
    // Define the expected JSON response schema for the analysis results
    const responseSchema = {
        type: 'json_schema',
        json_schema: {
            occupations: {
                type: 'array',
                description: 'ESCO/ISCO-08 occupations explicitly mentioned in the resume.',
                items: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description: 'English name of the occupation'
                        },
                        skills: {
                            type: 'array',
                            description: 'ESCO skills explicitly mentioned and linked to this occupation.',
                            items: {
                                type: 'string',
                                description: 'English name of the skill'
                            },
                        },
                    },
                },
            },
            skills: {
                type: 'array',
                description: 'ESCO skills explicitly mentioned and linked in the resume but not linked to a particular occupation.',
                items: {
                    type: 'string',
                    description: 'English name of the skill'
                },
            },
        },
    };

    // Make the OpenAI API call to analyze the resume and return the results in JSON format
    openAI.chat.completions.create({
        model: 'gpt-4o-mini', // Use the GPT-4o mini model
        files: formData,
        messages: [
            { role:"system", content: prompt}
        ],
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
