const OpenAIApi = require('openai')
const dotenv = require('dotenv')
const express = require('express')
const fs = require('fs')
const multer = require('multer')
const path = require('path')
const pdfParse = require('pdf-parse')
const z = require('zod')
const { zodResponseFormat } = require('openai/helpers/zod')
const { findSkill } = require('./skills')
const { findOccupation } = require('./occupations')

dotenv.config()

const app = express()
const upload = multer({ dest: 'analyse/' })

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '..', 'public')))
console.log(process.env['OPENAI_API_KEY'] ? '✅ API key is set' : '❌ API key is not set')

// Set up the openAPI endpoint, upload the resume file to OpenAI,
// constraining the JSON format response and include a custom prompt.
app.post('/analyze', upload.single('resume'), (req, res) => {
    const resumeFile = req.file; // Uploaded resume file
    if (!resumeFile) {
        console.error('❌ No resume file uploaded.')
        return res.status(400).send('No resume file uploaded.')
    }
    let resumeBuffer = fs.readFileSync(resumeFile.path)
    // Use PDF parsing to extract text from the resume
    pdfParse(resumeBuffer, {
        normalizeWhitespace: true,
    }).then(async (data) => {
        console.log(`✅ Reading ${data.numpages} pages from ${resumeFile.originalname}`)
        const resumeText = data.text;
        //save the extracted text to a file for debugging purposes
        fs.writeFileSync('analyse/resume_text.txt', resumeText)

        // Send the extracted text to OpenAI for analysis
        // create the OpenAI API client
        const openAI = new OpenAIApi({
            apiKey: process.env['OPENAI_API_KEY'],
        })
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
        let aiResponse

        try {
            aiResponse = await openAI.beta.chat.completions.parse({
                model: 'gpt-4o-mini', // Use the GPT-4o mini model
                temperature: 0.3,
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
        } catch (error) {
            console.error('❌ Error analyzing resume:', error)
            res.status(500).send('Error analyzing resume')
        }

        console.log('✅ Got response from openAI')
        const resume = JSON.parse(aiResponse.choices[0].message.content)

        for (const occupation of resume.occupations) {
            occupation.matchedOccupation = await findOccupation(occupation.name)

            if (occupation.matchedOccupation !== null) {
                for (let i = 0; i < occupation.matchedOccupation.skills.length; i++) {
                    const skill =
                        await findSkill(occupation.matchedOccupation.skills[i].uri)
                    occupation.matchedOccupation.skills[i] = {
                        ...occupation.matchedOccupation.skills[i],
                        // Resolve skill URI to skill facts
                        ...(skill ?? {})
                    }
                }
            }

            occupation.skills =
                occupation.skills.map(skillName => ({ name: skillName }))
            for (const skill of occupation.skills) {
                skill.matchedSkill = await findSkill(skill.name)

                // Fallback priority, if no occupation-skill relation exists
                skill.priority = 8
                skill.numVacancies = 0
                skill.pctVacencies = 0

                // Lookup stats for this occupation-skill relation
                if (skill.matchedSkill !== null && occupation.matchedOccupation !== null) {
                    const matchedOccupationSkill =
                        occupation.matchedOccupation.skills.find(occupationSkill =>
                            occupationSkill.uri === skill.matchedSkill.uri)
                    if (matchedOccupationSkill !== undefined) {
                        skill.matchedSkill = matchedOccupationSkill
                    }
                }
            }
        }

        resume.skills = resume.skills.map(skillName => ({ name: skillName }))
        for (const skill of resume.skills) {
            skill.matchedSkill = await findSkill(skill.name)
        }

        res.json(resume)

        // Remove the uploaded file from the hard drive
        fs.unlinkSync(resumeFile.path)
        console.log(`✅ Removed ${resumeFile.originalname} from the hard drive`)
    })
})

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`)
})
