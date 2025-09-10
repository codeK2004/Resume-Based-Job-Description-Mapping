'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from '../page.module.css';
import { storage } from '@/utils/storage';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface JobRecommendation {
  jobTitle: string;
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

type TabType = 'description' | 'threshold' | 'skills';

export default function JobDetails() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('description');

  useEffect(() => {
    const loadJobDetails = async () => {
      try {
        const jobId = params?.id;
        if (!jobId || typeof jobId !== 'string') {
          setError('Invalid job ID');
          setLoading(false);
          return;
        }

        const recommendations = storage.getJobRecommendations();
        const jobIndex = parseInt(jobId);
        
        if (!recommendations || jobIndex >= recommendations.length) {
          setError('Job details not found.');
          return;
        }

        setJob(recommendations[jobIndex]);
      } catch (err) {
        console.error('Error loading job details:', err);
        setError('Failed to load job details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadJobDetails();
  }, [params?.id]);

  if (loading) {
    return (
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loader} />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error || 'Job not found'}</p>
            <button 
              onClick={() => router.push('/job-recommendations')}
              className={styles.applyButton}
            >
              Back to Recommendations
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    if (!job) return null;

    switch (activeTab) {
      case 'description':
        return (
          <div className={styles.tabContent}>
            <h3>Job Description</h3>
            <p>{job.reasoning || 'No description available'}</p>
          </div>
        );
      case 'threshold':
        if (!job.thresholdScore) {
          return (
            <div className={styles.tabContent}>
              <h3>Threshold Analysis</h3>
              <p>No threshold data available</p>
            </div>
          );
        }

        const { overallScore, selectionPercentage, rejectionPercentage, barGraphMetrics } = job.thresholdScore;

        const thresholdData = {
          labels: ['Skills Match', 'Experience', 'Education', 'Overall Potential'],
          datasets: [{
            data: [
              barGraphMetrics.skillMatch,
              barGraphMetrics.experienceMatch,
              barGraphMetrics.educationMatch,
              barGraphMetrics.overallMatch
            ],
            backgroundColor: [
              '#4f46e5', // Skills Match
              '#6366f1', // Experience
              '#818cf8', // Education
              '#a5b4fc'  // Overall Potential
            ],
            borderWidth: 0,
          }],
        };

        const breakdownData = {
          labels: ['Selection', 'Rejection'],
          datasets: [{
            label: 'Percentage',
            data: [selectionPercentage, rejectionPercentage],
            backgroundColor: [
              '#4f46e5', // Selection
              '#fee2e2'  // Rejection
            ],
            borderRadius: 4,
          }],
        };

        const chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom' as const,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Percentage (%)'
              }
            }
          }
        };

        return (
          <div className={styles.tabContent}>
            <h3>Threshold Analysis</h3>
            <div className={styles.thresholdVisualization}>
              <div className={styles.pieChart}>
                <Pie data={thresholdData} options={chartOptions} />
              </div>
              <div className={styles.barChart}>
                <Bar data={breakdownData} options={chartOptions} />
              </div>
            </div>
            <div className={styles.thresholdScore}>
              <h4>Detailed Analysis</h4>
              <p>{job.thresholdScore.detailedAnalysis || 'No detailed analysis available'}</p>
            </div>
          </div>
        );
      case 'skills':
        return (
          <div className={styles.tabContent}>
            <h3>Required Skills</h3>
            <div className={styles.skillsList}>
              {job.requiredSkills?.length > 0 ? (
                job.requiredSkills.map((skill, i) => (
                  <span key={i} className={styles.skillTag}>
                    {skill}
                  </span>
                ))
              ) : (
                <p>No required skills listed</p>
              )}
            </div>
            {job.missingSkills?.length > 0 && (
              <>
                <h3>Skills to Develop</h3>
                <div className={styles.skillsList}>
                  {job.missingSkills.map((skill, i) => (
                    <span key={i} className={`${styles.skillTag} ${styles.missing}`}>
                      {skill}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button 
            onClick={() => router.push('/job-recommendations')}
            className={styles.backButton}
          >
            ← Back to Recommendations
          </button>
          <h1 className={styles.title}>{job.jobTitle}</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.tabNavigation}>
            <div className={styles.tabButtons}>
              <button
                className={`${styles.tabButton} ${activeTab === 'description' ? styles.active : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Job Description
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'threshold' ? styles.active : ''}`}
                onClick={() => setActiveTab('threshold')}
              >
                Threshold Score
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'skills' ? styles.active : ''}`}
                onClick={() => setActiveTab('skills')}
              >
                Required Skills
              </button>
            </div>
            <div className={styles.matchScore}>
              {Math.round(job.thresholdScore.selectionPercentage)}% Match
            </div>
          </div>

          {renderTabContent()}

          <button className={styles.applyButton}>
            Apply for this Position
          </button>
        </div>
      </div>
    </div>
  );
} 