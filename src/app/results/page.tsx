'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';

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
  text: string;
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

export default function Results() {
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState<{
    resumeAnalysis: ResumeAnalysis;
    jobRecommendations: JobRecommendation[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError('');
        
        // First get the resume data
        const resumeResponse = await fetch('/api/resume');
        if (!resumeResponse.ok) {
          throw new Error('Failed to fetch resume data');
        }
        const resumeData = await resumeResponse.json();
        
        if (!resumeData.text) {
          throw new Error('No resume text found');
        }
        
        // Then analyze the resume
        const analyzeResponse = await fetch('/api/resume/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resumeText: resumeData.text }),
        });
        
        let analysisData;
        try {
          analysisData = await analyzeResponse.json();
        } catch (parseError) {
          console.error('Error parsing analysis response:', parseError);
          throw new Error('Invalid response from analysis service');
        }
        
        if (!analyzeResponse.ok) {
          throw new Error(analysisData.error || 'Failed to analyze resume');
        }
        
        // Validate the response structure
        if (!analysisData.resumeAnalysis || !analysisData.jobRecommendations) {
          console.error('Invalid analysis data structure:', analysisData);
          throw new Error('Invalid analysis data structure');
        }
        
        setAnalysisData(analysisData);
      } catch (err: any) {
        console.error('Error fetching analysis:', err);
        setError(err.message || 'Failed to load analysis results');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loader}></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
            <button
              className={styles.retryButton}
              onClick={() => router.push('/')}
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!analysisData) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>No analysis data available</p>
            <button
              className={styles.retryButton}
              onClick={() => router.push('/')}
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Resume Analysis Results</h1>
        </div>

        <div className={styles.content}>
          {/* Resume Analysis Section */}
          <section className={styles.section}>
            <h2>Resume Analysis</h2>
            <div className={styles.resumeDetails}>
              <div className={styles.detailItem}>
                <h3>Personal Information</h3>
                <p>Name: {analysisData.resumeAnalysis.name}</p>
                <p>Email: {analysisData.resumeAnalysis.email}</p>
                <p>Phone: {analysisData.resumeAnalysis.phone}</p>
              </div>

              <div className={styles.detailItem}>
                <h3>Education</h3>
                {analysisData.resumeAnalysis.education.map((edu, index) => (
                  <div key={index} className={styles.educationItem}>
                    <p>{edu.degree} {edu.institution}</p>
                    <p>{edu.year}</p>
                  </div>
                ))}
              </div>

              <div className={styles.detailItem}>
                <h3>Experience</h3>
                {analysisData.resumeAnalysis.experience.map((exp, index) => (
                  <div key={index} className={styles.experienceItem}>
                    <h4>{exp.position} at {exp.company}</h4>
                    <p>{exp.duration}</p>
                    <p>{exp.description}</p>
                  </div>
                ))}
              </div>

              <div className={styles.detailItem}>
                <h3>Skills</h3>
                <div className={styles.skillsList}>
                  {analysisData.resumeAnalysis.skills.map((skill, index) => (
                    <span key={index} className={styles.skillTag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Job Recommendations Section */}
          <section className={styles.section}>
            <h2>Job Recommendations</h2>
            <div className={styles.recommendations}>
              {analysisData.jobRecommendations.map((job, index) => (
                <div key={index} className={styles.jobCard}>
                  <h3>{job.jobTitle}</h3>
                  <div className={styles.scoreContainer}>
                    <div className={styles.score}>
                      <span>Match Score</span>
                      <div className={styles.scoreValue}>{job.matchScore}%</div>
                    </div>
                    <div className={styles.score}>
                      <span>Threshold Score</span>
                      <div className={styles.scoreValue}>{job.thresholdScore.overallScore}%</div>
                    </div>
                  </div>

                  <div className={styles.scoreBreakdown}>
                    <h4>Score Breakdown</h4>
                    <div className={styles.breakdownGrid}>
                      <div className={styles.breakdownItem}>
                        <span>Skills Match</span>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progress} 
                            style={{ width: `${job.thresholdScore.barGraphMetrics.skillMatch}%` }}
                          ></div>
                        </div>
                        <span>{job.thresholdScore.barGraphMetrics.skillMatch}%</span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span>Experience</span>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progress} 
                            style={{ width: `${job.thresholdScore.barGraphMetrics.experienceMatch}%` }}
                          ></div>
                        </div>
                        <span>{job.thresholdScore.barGraphMetrics.experienceMatch}%</span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span>Education</span>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progress} 
                            style={{ width: `${job.thresholdScore.barGraphMetrics.educationMatch}%` }}
                          ></div>
                        </div>
                        <span>{job.thresholdScore.barGraphMetrics.educationMatch}%</span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span>Overall</span>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progress} 
                            style={{ width: `${job.thresholdScore.barGraphMetrics.overallMatch}%` }}
                          ></div>
                        </div>
                        <span>{job.thresholdScore.barGraphMetrics.overallMatch}%</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.analysis}>
                    <h4>Analysis</h4>
                    <p>{job.thresholdScore.detailedAnalysis}</p>
                  </div>

                  <div className={styles.skillsAnalysis}>
                    <div className={styles.requiredSkills}>
                      <h4>Required Skills</h4>
                      <div className={styles.skillsList}>
                        {job.requiredSkills.map((skill, index) => (
                          <span key={index} className={styles.skillTag}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.missingSkills}>
                      <h4>Missing Skills</h4>
                      <div className={styles.skillsList}>
                        {job.missingSkills.map((skill, index) => (
                          <span key={index} className={`${styles.skillTag} ${styles.missing}`}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
} 