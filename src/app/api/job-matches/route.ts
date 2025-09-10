import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Sample job data - In a real app, this would come from a database
const jobs = [
  {
    id: '1',
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'Remote',
    description: 'Looking for a skilled frontend developer with experience in modern web technologies.',
    skills: ['html', 'css', 'javascript', 'react'],
    matchPercentage: 0
  },
  {
    id: '2',
    title: 'Java Developer',
    company: 'Enterprise Solutions',
    location: 'New York, NY',
    description: 'Seeking a Java developer to work on enterprise applications.',
    skills: ['java', 'spring', 'sql'],
    matchPercentage: 0
  },
  {
    id: '3',
    title: 'Full Stack Developer',
    company: 'StartupX',
    location: 'San Francisco, CA',
    description: 'Join our dynamic team building innovative web applications.',
    skills: ['java', 'javascript', 'html', 'css', 'sql'],
    matchPercentage: 0
  }
];

export async function GET() {
  try {
    // Get the user's skills from the most recent resume
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = fs.readdirSync(uploadsDir);
    
    if (files.length === 0) {
      return NextResponse.json([]);
    }

    // Get the most recent resume file
    const mostRecentFile = files
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(uploadsDir, file)).ctime.getTime()
      }))
      .sort((a, b) => b.time - a.time)[0];

    // In a real application, you would parse the resume or get skills from a database
    // For now, we'll use the skills we know were parsed
    const userSkills = ['java', 'html', 'css', 'sql'];

    // Calculate match percentage for each job
    const matchedJobs = jobs.map(job => {
      const matchingSkills = job.skills.filter(skill => 
        userSkills.includes(skill.toLowerCase())
      );
      const matchPercentage = Math.round((matchingSkills.length / job.skills.length) * 100);
      
      return {
        ...job,
        matchPercentage
      };
    });

    // Sort by match percentage (highest first)
    const sortedJobs = matchedJobs.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // Only return jobs with at least one matching skill
    const filteredJobs = sortedJobs.filter(job => job.matchPercentage > 0);

    return NextResponse.json(filteredJobs);
  } catch (error) {
    console.error('Error fetching job matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job matches' },
      { status: 500 }
    );
  }
} 