interface ResumeAnalysis {
  name: string;
  email: string;
  phone: string;
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
}

interface JobRecommendation {
  jobTitle: string;
  matchScore: number;
  reasoning: string;
  requiredSkills: string[];
  missingSkills: string[];
  thresholdScore: {
    overallScore: number;
    selectionPercentage: number;
    rejectionPercentage: number;
    barGraphMetrics: {
      skillMatch: number;
      experienceMatch: number;
      educationMatch: number;
      overallMatch: number;
    };
    detailedAnalysis: string;
  };
}

class Storage {
  private static instance: Storage;
  private constructor() {}

  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  getResumeAnalysis(): ResumeAnalysis | null {
    try {
      const data = localStorage.getItem('resumeAnalysis');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting resume analysis:', error);
      return null;
    }
  }

  setResumeAnalysis(analysis: ResumeAnalysis): void {
    try {
      localStorage.setItem('resumeAnalysis', JSON.stringify(analysis));
    } catch (error) {
      console.error('Error setting resume analysis:', error);
    }
  }

  getJobRecommendations(): JobRecommendation[] {
    try {
      const data = localStorage.getItem('jobRecommendations');
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      // Handle both old and new data structure
      if (Array.isArray(parsed)) {
        return parsed.map(job => ({
          jobTitle: job.jobTitle || job.title || '',
          matchScore: job.matchScore || 0,
          reasoning: job.reasoning || '',
          requiredSkills: job.requiredSkills || [],
          missingSkills: job.missingSkills || [],
          thresholdScore: job.thresholdScore || {
            overallScore: 0,
            selectionPercentage: 0,
            rejectionPercentage: 100,
            barGraphMetrics: {
              skillMatch: 0,
              experienceMatch: 0,
              educationMatch: 0,
              overallMatch: 0
            },
            detailedAnalysis: ''
          }
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting job recommendations:', error);
      return [];
    }
  }

  setJobRecommendations(recommendations: JobRecommendation[]): void {
    try {
      localStorage.setItem('jobRecommendations', JSON.stringify(recommendations));
    } catch (error) {
      console.error('Error setting job recommendations:', error);
    }
  }

  clearAll(): void {
    try {
      localStorage.removeItem('resumeAnalysis');
      localStorage.removeItem('jobRecommendations');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  clearUser(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }
}

export const storage = Storage.getInstance(); 