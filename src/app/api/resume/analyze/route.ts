import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { analyzeResume, getJobRecommendations, calculateThresholdScore } from '@/utils/gemini';

export async function POST(request: Request) {
  try {
    // Validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      );
    }

    const { resumeText } = body;

    if (!resumeText) {
      return NextResponse.json(
        { error: 'Resume text is required' },
        { status: 400 }
      );
    }

    if (typeof resumeText !== 'string') {
      return NextResponse.json(
        { error: 'Resume text must be a string' },
        { status: 400 }
      );
    }

    if (resumeText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Resume text cannot be empty' },
        { status: 400 }
      );
    }

    // Check if uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.error('Uploads directory does not exist');
      return NextResponse.json(
        { error: 'Uploads directory not found' },
        { status: 500 }
      );
    }

    try {
      // Analyze resume using Gemini
      const resumeAnalysis = await analyzeResume(resumeText);
      
      if (!resumeAnalysis) {
        throw new Error('Failed to analyze resume');
      }

      // Get job recommendations
      const jobRecommendations = await getJobRecommendations(resumeAnalysis);
      
      if (!jobRecommendations || !jobRecommendations.recommendations) {
        throw new Error('Failed to get job recommendations');
      }

      // Calculate threshold scores for each recommended job with delay between calls
      const thresholdScores = await Promise.all(
        jobRecommendations.recommendations.map(async (job: any, index: number) => {
          try {
            // Add longer delay between API calls to avoid rate limiting
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
            }
            
            const score = await calculateThresholdScore(resumeAnalysis, job.jobTitle);
            return {
              ...job,
              thresholdScore: score
            };
          } catch (scoreError: any) {
            console.error(`Error calculating threshold score for ${job.jobTitle}:`, scoreError);
            // If we hit rate limit, wait longer before next attempt
            if (scoreError.message?.includes('429')) {
              await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
            }
            return {
              ...job,
              thresholdScore: {
                overallScore: 0,
                breakdown: {
                  skillsMatch: 0,
                  experienceRelevance: 0,
                  educationAlignment: 0,
                  overallPotential: 0
                },
                detailedAnalysis: 'Failed to calculate threshold score due to rate limiting'
              }
            };
          }
        })
      );

      // Save the analysis results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const analysisPath = path.join(uploadsDir, `${timestamp}-gemini-analysis.json`);
      
      const analysisData = {
        resumeAnalysis,
        jobRecommendations: thresholdScores,
        timestamp
      };

      try {
        fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));
      } catch (writeError) {
        console.error('Error saving analysis results:', writeError);
        // Continue even if saving fails
      }

      return NextResponse.json(analysisData);
    } catch (analysisError: any) {
      console.error('Error during resume analysis:', analysisError);
      return NextResponse.json(
        { 
          error: `Analysis failed: ${analysisError.message || 'Unknown error'}`,
          details: analysisError.stack
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in analyze endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 