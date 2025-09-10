import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Add delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add retry logic
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 8,
  initialDelay: number = 2000
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      if (retries >= maxRetries) {
        if (error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
          throw new Error('The AI service is currently busy. Please try again in a few minutes. We apologize for the inconvenience.');
        }
        throw error;
      }
      
      // Handle rate limiting (429) and service unavailability (503)
      if (error.message?.includes('429') || 
          error.message?.includes('503') || 
          error.message?.includes('Service Unavailable') ||
          error.message?.includes('Too Many Requests')) {
        
        // Extract retry delay from error message if available
        const retryDelayMatch = error.message.match(/retryDelay":"(\d+)s"/);
        const suggestedDelay = retryDelayMatch ? parseInt(retryDelayMatch[1]) * 1000 : delay;
        
        console.log(`Service unavailable or rate limited, retrying in ${suggestedDelay}ms... (Attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, suggestedDelay));
        
        // Exponential backoff with jitter
        const jitter = Math.random() * 2000;
        delay = Math.min(delay * 1.5 + jitter, 30000);
        retries++;
        continue;
      }
      throw error;
    }
  }
}

// Add a delay between API calls
const delayBetweenCalls = async (ms: number = 3000) => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

// Function to analyze resume and extract details
export async function analyzeResume(resumeText: string) {
  try {
    await delayBetweenCalls();
    const model = genAI.getGenerativeModel({ 
      model: 'models/gemini-2.0-flash',
      generationConfig: {
        temperature: 0.2, // Reduced temperature for more consistent output
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    const prompt = `You are a precise resume parser. Extract ONLY the following information from the resume text in JSON format:
    {
      "name": "Full name of the person",
      "email": "Email address",
      "phone": "Phone number",
      "education": [
        {
          "degree": "Exact degree name (e.g., B.Tech, M.Sc)",
          "institution": "Full institution name",
          "year": "Year of completion or graduation"
        }
      ],
      "experience": [
        {
          "company": "Company name",
          "position": "Job title/position",
          "duration": "Duration (e.g., '2020-2022' or '2 years')",
          "description": "Key responsibilities and achievements"
        }
      ],
      "skills": ["List of technical and soft skills"]
    }

    Rules:
    1. Extract ONLY the information that is explicitly stated in the resume
    2. Do not make assumptions or add information that is not present
    3. For experience, only include roles that are clearly mentioned
    4. For education, only include degrees that are explicitly stated
    5. For skills, only list skills that are specifically mentioned
    6. If any field is not found in the resume, use an empty string or empty array
    7. Do not add any additional fields or information

    Resume text: ${resumeText}`;

    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const result = await retryWithBackoff(async () => {
          const response = await model.generateContent(prompt);
          return response.response;
        });

        const text = result.text();
        // More aggressive cleaning of the response
        const cleanedText = text
          .replace(/```json\n?|\n?```/g, '') // Remove markdown code blocks
          .replace(/^[^{]*/, '') // Remove any text before the first {
          .replace(/[^}]*$/, '') // Remove any text after the last }
          .trim();
        
        try {
          const parsed = JSON.parse(cleanedText);
          // Validate the structure
          if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid response structure');
          }

          // Ensure required fields exist with proper types
          const validatedResponse = {
            name: typeof parsed.name === 'string' ? parsed.name : '',
            email: typeof parsed.email === 'string' ? parsed.email : '',
            phone: typeof parsed.phone === 'string' ? parsed.phone : '',
            education: Array.isArray(parsed.education) ? parsed.education.map((edu: any) => ({
              degree: typeof edu.degree === 'string' ? edu.degree : '',
              institution: typeof edu.institution === 'string' ? edu.institution : '',
              year: typeof edu.year === 'string' ? edu.year : ''
            })) : [],
            experience: Array.isArray(parsed.experience) ? parsed.experience.map((exp: any) => ({
              company: typeof exp.company === 'string' ? exp.company : '',
              position: typeof exp.position === 'string' ? exp.position : '',
              duration: typeof exp.duration === 'string' ? exp.duration : '',
              description: typeof exp.description === 'string' ? exp.description : ''
            })) : [],
            skills: Array.isArray(parsed.skills) ? parsed.skills.filter((skill: any) => typeof skill === 'string') : []
          };

          return validatedResponse;
        } catch (parseError) {
          console.error(`Attempt ${attempts + 1} - JSON Parse Error:`, parseError);
          console.error('Raw text:', cleanedText);
          attempts++;
          if (attempts === maxAttempts) {
            throw new Error('Failed to get valid JSON response after multiple attempts');
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Failed to get valid response after all attempts');
  } catch (error: any) {
    console.error('Error analyzing resume:', error);
    if (error.message?.includes('API key')) {
      throw new Error('Invalid or missing Gemini API key. Please check your .env.local file.');
    }
    if (error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
      throw new Error('The AI service is currently busy. Please try again in a few minutes. We apologize for the inconvenience.');
    }
    if (error.message?.includes('404')) {
      throw new Error('Gemini API model not found. Please check your API key and model name.');
    }
    if (error.message?.includes('permission')) {
      throw new Error('API key does not have permission to access Gemini API. Please check your API key permissions.');
    }
    throw new Error(`Analysis failed: ${error.message || 'Unknown error'}`);
  }
}

// Function to get job recommendations based on resume
export async function getJobRecommendations(resumeAnalysis: any) {
  try {
    await delayBetweenCalls();
    const model = genAI.getGenerativeModel({ 
      model: 'models/gemini-2.0-flash',
      generationConfig: {
        temperature: 0.2, // Reduced temperature for more consistent output
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    const prompt = `You are an AI job matching expert. Based on the candidate's resume, suggest 5 most suitable job positions.
    
    For each job recommendation, provide:
    1. A specific job title that matches their experience and skills
    2. A match score (0-100) based on:
       - Skills alignment
       - Experience relevance
       - Education requirements
       - Industry fit
    3. A detailed reasoning for the match
    4. Required skills they have
    5. Missing skills they need to develop

    Return the response in this exact JSON format:
    {
      "recommendations": [
        {
          "jobTitle": "Specific job title",
          "matchScore": number between 0-100,
          "reasoning": "Detailed explanation of why this job is a good match",
          "requiredSkills": ["List of required skills they have"],
          "missingSkills": ["List of important skills they need to develop"]
        }
      ]
    }

    Rules:
    1. Only recommend jobs that are realistic based on their experience
    2. Be specific with job titles (e.g., "Frontend Developer" not just "Developer")
    3. Provide detailed reasoning for each match
    4. List only relevant required and missing skills
    5. Match scores should reflect actual fit, not just wishful thinking

    Resume Analysis: ${JSON.stringify(resumeAnalysis)}`;

    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const result = await retryWithBackoff(async () => {
          const response = await model.generateContent(prompt);
          return response.response;
        });

        const text = result.text();
        // More aggressive cleaning of the response
        const cleanedText = text
          .replace(/```json\n?|\n?```/g, '') // Remove markdown code blocks
          .replace(/^[^{]*/, '') // Remove any text before the first {
          .replace(/[^}]*$/, '') // Remove any text after the last }
          .trim();
        
        try {
          const parsed = JSON.parse(cleanedText);
          // Validate the structure
          if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.recommendations)) {
            throw new Error('Invalid response structure');
          }

          // Validate and clean each recommendation
          const validatedRecommendations = parsed.recommendations.map((rec: any) => ({
            jobTitle: typeof rec.jobTitle === 'string' ? rec.jobTitle : 'Unknown Position',
            matchScore: typeof rec.matchScore === 'number' ? Math.min(Math.max(rec.matchScore, 0), 100) : 0,
            reasoning: typeof rec.reasoning === 'string' ? rec.reasoning : 'No reasoning provided',
            requiredSkills: Array.isArray(rec.requiredSkills) ? rec.requiredSkills.filter((skill: any) => typeof skill === 'string') : [],
            missingSkills: Array.isArray(rec.missingSkills) ? rec.missingSkills.filter((skill: any) => typeof skill === 'string') : []
          }));

          return { recommendations: validatedRecommendations };
        } catch (parseError) {
          console.error(`Attempt ${attempts + 1} - JSON Parse Error:`, parseError);
          console.error('Raw text:', cleanedText);
          attempts++;
          if (attempts === maxAttempts) {
            throw new Error('Failed to get valid JSON response after multiple attempts');
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Failed to get valid response after all attempts');
  } catch (error: any) {
    console.error('Error getting job recommendations:', error);
    if (error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
      throw new Error('The AI service is currently busy. Please try again in a few minutes. We apologize for the inconvenience.');
    }
    throw new Error(`Failed to get job recommendations: ${error.message || 'Unknown error'}`);
  }
}

// Function to calculate threshold score
export async function calculateThresholdScore(resumeAnalysis: any, jobTitle: string) {
  try {
    await delayBetweenCalls();
    const model = genAI.getGenerativeModel({ 
      model: 'models/gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    const prompt = `You are a precise job matching analyzer. Calculate an accurate threshold score for the candidate's fit for the position of ${jobTitle}.
    
    Analyze the candidate's skills and experience in detail, considering:
    1. Skills Match (0-30 points):
       - Count exact matches of required technical skills
       - Consider skill proficiency levels if mentioned
       - Weight core skills more heavily than supplementary skills
       - Calculate as: (matching skills / total required skills) * 30
    
    2. Experience Relevance (0-30 points):
       - Evaluate duration and recency of relevant experience
       - Consider project complexity and scope
       - Weight experience that directly relates to the job title
       - Calculate as: (relevant experience months / expected experience months) * 30
    
    3. Education Alignment (0-20 points):
       - Match degree requirements with candidate's education
       - Consider field of study relevance
       - Weight recent education more heavily
       - Calculate as: (education match score / 100) * 20
    
    4. Overall Potential (0-20 points):
       - Evaluate learning curve and adaptability
       - Consider career progression
       - Assess complementary skills
       - Calculate as: (potential score / 100) * 20
    
    You must respond with ONLY a valid JSON object in this exact format:
    {
      "overallScore": number,
      "selectionPercentage": number,
      "rejectionPercentage": number,
      "barGraphMetrics": {
        "skillMatch": number,
        "experienceMatch": number,
        "educationMatch": number,
        "overallMatch": number
      },
      "detailedAnalysis": "string"
    }

    Rules:
    1. Be extremely precise with skill matching
    2. Selection percentage should be based on overall score
    3. Rejection percentage should be (100 - selection percentage)
    4. All percentages should be between 0-100
    5. Bar graph metrics should be percentages (0-100)
    6. Provide specific examples in the analysis
    
    Resume Analysis: ${JSON.stringify(resumeAnalysis)}`;

    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const result = await retryWithBackoff(async () => {
          const response = await model.generateContent(prompt);
          return response.response;
        });

        const text = result.text();
        const cleanedText = text
          .replace(/```json\n?|\n?```/g, '')
          .replace(/^[^{]*/, '')
          .replace(/[^}]*$/, '')
          .trim();
        
        try {
          const parsed = JSON.parse(cleanedText);
          
          // Validate the structure and ensure all required fields exist
          if (!parsed.barGraphMetrics ||
              typeof parsed.selectionPercentage !== 'number' ||
              typeof parsed.rejectionPercentage !== 'number') {
            throw new Error('Invalid response structure');
          }

          // Ensure all percentages are within valid range
          const validatedResponse = {
            overallScore: Math.min(Math.max(parsed.overallScore || 0, 0), 100),
            selectionPercentage: Math.min(Math.max(parsed.selectionPercentage || 0, 0), 100),
            rejectionPercentage: Math.min(Math.max(parsed.rejectionPercentage || 0, 0), 100),
            barGraphMetrics: {
              skillMatch: Math.min(Math.max(parsed.barGraphMetrics.skillMatch || 0, 0), 100),
              experienceMatch: Math.min(Math.max(parsed.barGraphMetrics.experienceMatch || 0, 0), 100),
              educationMatch: Math.min(Math.max(parsed.barGraphMetrics.educationMatch || 0, 0), 100),
              overallMatch: Math.min(Math.max(parsed.barGraphMetrics.overallMatch || 0, 0), 100)
            },
            detailedAnalysis: typeof parsed.detailedAnalysis === 'string' 
              ? parsed.detailedAnalysis 
              : 'No detailed analysis provided'
          };

          return validatedResponse;
        } catch (parseError) {
          console.error(`Attempt ${attempts + 1} - JSON Parse Error:`, parseError);
          console.error('Raw text:', cleanedText);
          attempts++;
          if (attempts === maxAttempts) {
            throw new Error('Failed to get valid JSON response after multiple attempts');
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Failed to get valid response after all attempts');
  } catch (error: any) {
    console.error('Error calculating threshold score:', error);
    if (error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
      throw new Error('The AI service is currently busy. Please try again in a few minutes. We apologize for the inconvenience.');
    }
    return {
      overallScore: 0,
      selectionPercentage: 0,
      rejectionPercentage: 100,
      barGraphMetrics: {
        skillMatch: 0,
        experienceMatch: 0,
        educationMatch: 0,
        overallMatch: 0
      },
      detailedAnalysis: 'The AI service is currently busy. Please try again in a few minutes.'
    };
  }
} 