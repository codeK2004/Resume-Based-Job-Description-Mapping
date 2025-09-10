'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/utils/storage';
import styles from '../page.module.css';

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

export default function Jobs() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadRecommendations = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get the stored resume analysis
        const analysis = storage.getResumeAnalysis();
        
        if (!analysis) {
          throw new Error('No resume data found. Please upload your resume first.');
        }
        
        // Get job recommendations based on the analysis
        const response = await fetch('/api/jobs/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ analysis }),
        });

        if (!response.ok) {
          throw new Error('Failed to get job recommendations');
        }

        const data = await response.json();
        setRecommendations(data.recommendations);
      } catch (err: any) {
        console.error('Error loading recommendations:', err);
        setError(err.message || 'Failed to load job recommendations');
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [mounted]);

  if (!mounted) {
    return null;
  }

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
              Upload Resume
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
          <h1 className={styles.title}>Job Recommendations</h1>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <div className={styles.recommendationsList}>
              {recommendations.map((job, index) => (
                <div key={index} className={styles.jobCard}>
                  <div className={styles.jobHeader}>
                    <h3>{job.jobTitle}</h3>
                    <div className={styles.matchScore}>
                      Match Score: {job.matchScore}%
                    </div>
                  </div>
                  
                  <div className={styles.jobDetails}>
                    <p className={styles.reasoning}>{job.reasoning}</p>
                    
                    <div className={styles.skillsSection}>
                      <div className={styles.skillsList}>
                        <h4>Required Skills:</h4>
                        {job.requiredSkills.map((skill, i) => (
                          <span key={i} className={styles.skillTag}>
                            {skill}
                          </span>
                        ))}
                      </div>
                      
                      <div className={styles.skillsList}>
                        <h4>Skills to Develop:</h4>
                        {job.missingSkills.map((skill, i) => (
                          <span key={i} className={`${styles.skillTag} ${styles.missing}`}>
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