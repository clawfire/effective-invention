require('dotenv').config();
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const path = require('path');
const OpenAIApi = require('openai');
const pdfParse = require('pdf-parse');
const z = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

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
    let resumeBuffer = fs.readFileSync(resumeFile.path);
    // Use PDF parsing to extract text from the resume
    pdfParse(resumeBuffer, {
        normalizeWhitespace: true,
    }).then((data) => {
        console.log(`✅ Reading ${data.numpages} pages from ${resumeFile.originalname}`)
        const resumeText = data.text;
        //save the extracted text to a file for debugging purposes
        fs.writeFileSync('analyse/resume_text.txt', resumeText);

        // Send the extracted text to OpenAI for analysis
        // create the OpenAI API client
        const openAI = new OpenAIApi({
            apiKey: process.env['OPENAI_API_KEY'],
        });
        const prompt = "You are an HR specialist assistant. Analyze the following resume and extract occupations and skills as follows: 1. Extract all occupations listed in the resume. For each occupation, identify the closest corresponding occupation title in the ESCO database (in English). If the exact title isn't available, use the closest match based on the description. 2. For each occupation, extract any listed skills directly related to that occupation. For each skill, find the closest matching skill in the ESCO database (in English). If a skill is expressed as a compound (e.g., 'project management and leadership') or in a list format (e.g., 'programming languages: Python, Java'), break it into individual skills based on ESCO categories. 3. Any skills not tied to a specific occupation should be classified as 'General Skills' and follow the same ESCO matching process. 4. Ensure all extracted occupations and skills are translated into English, if necessary, before matching to ESCO. Use professional, context-appropriate translations."

        // Define the expected JSON response schema for the analysis results
        const responseSchema = z.object({
            occupations: z.array(z.object({
                name: z.string().describe('English name of the occupation'),
                skills: z.array(z.string().describe('English name of the skill'))
                    .describe('ESCO skills explicitly mentioned and linked to this occupation.')
            })).describe('ESCO/ISCO-08 occupations explicitly mentioned in the resume.'),
            skills: z.array(z.string().describe('English name of the skill'))
                .describe('ESCO skills explicitly mentioned but not linked to a particular occupation.')
        })

        // Make the OpenAI API call to analyze the resume and return the results in JSON format
        openAI.beta.chat.completions.parse({
            model: 'gpt-4o-mini', // Use the GPT-4o mini model
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "text", text: `Resume data: ${resumeText}` }
                    ]
                }
            ],
            response_format: zodResponseFormat(responseSchema, 'resume'),
        })
            .then((response) => {
                console.log('response.data', JSON.stringify(response))
                res.json(response.choices[0].message.content);
            })
            .catch((error) => {
                console.error('❌ Error analyzing resume:', error);
                res.status(500).send('Error analyzing resume');
            });
    })
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
