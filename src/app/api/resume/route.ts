import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get the most recent resume file from uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.error('Uploads directory does not exist');
      return NextResponse.json(
        { error: 'No uploads directory found' },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(uploadsDir);
    
    if (files.length === 0) {
      console.error('No files found in uploads directory');
      return NextResponse.json(
        { error: 'No resume uploaded yet' },
        { status: 404 }
      );
    }

    // Find the most recent parsed JSON file
    const jsonFiles = files.filter(file => file.endsWith('-parsed.json'));
    if (jsonFiles.length === 0) {
      console.error('No parsed JSON files found');
      return NextResponse.json(
        { error: 'No parsed resume data found' },
        { status: 404 }
      );
    }

    // Sort files by creation time (most recent first)
    const mostRecentJsonFile = jsonFiles
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(uploadsDir, file)).ctime.getTime()
      }))
      .sort((a, b) => b.time - a.time)[0].name;

    // Read the parsed data from the JSON file
    const jsonPath = path.join(uploadsDir, mostRecentJsonFile);
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    
    try {
      const parsedData = JSON.parse(fileContent);
      
      // Validate the parsed data
      if (!parsedData.text) {
        console.error('No text content found in parsed data');
        return NextResponse.json(
          { error: 'Invalid resume data format' },
          { status: 400 }
        );
      }

      // Return both the structured data and the raw text
      return NextResponse.json({
        ...parsedData,
        text: parsedData.text
      });
    } catch (parseError) {
      console.error('Error parsing JSON file:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse resume data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching resume data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume data' },
      { status: 500 }
    );
  }
} 